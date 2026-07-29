// controllers/orders/cancelorder.js
const Order = require('../../models/order');
const Payment = require('../../models/payment');
const OrderItem = require('../../models/orderitem');
const Product = require('../../models/product');
// Servicio de reembolso externo (implementalo según proveedor: mercadopago, stripe, etc.)
let MercadoPagoService;

try { MercadoPagoService = require('../../services/mercadopago'); } catch (e) { MercadoPagoService = null; }

module.exports = async (req, res) => {
    const t = await Order.sequelize.transaction();
    try {
        const { id } = req.params;
        const user = req.user || {};

        // validación id
        if (!id || Number.isNaN(Number.parseInt(id, 10))) {
            await t.rollback();
            return res.status(400).json({ status: 'error', message: 'ID de pedido inválido' });
        }

        // Buscar la orden con items y pagos (lock para evitar race conditions durante la modificación)
        const order = await Order.findByPk(id, {
            include: [
                { model: Payment, as: 'payments' },
                { model: OrderItem, as: 'items' }
            ],
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!order) {
            await t.rollback();
            return res.status(404).json({ status: 'error', message: 'Pedido no encontrado' });
        }

        // Reglas de negocio
        if (order.status === 'completed') {
            await t.rollback();
            return res.status(409).json({ status: 'error', message: 'No se puede cancelar un pedido ya completado' });
        }

        // Determinar si el usuario es admin (soportamos varias formas de que req.user venga)
        const userRoleName = user.role_name || (user.role && user.role.role_name) || null;
        const userRolesArray = user.roles || null; // si tu middleware adjunta roles[]
        const isAdmin = (
            (typeof userRoleName === 'string' && ['admin', 'superadmin'].includes(userRoleName)) ||
            (Array.isArray(userRolesArray) && userRolesArray.some(r => ['admin', 'superadmin'].includes(r))) ||
            user.isAdmin === true // por compatibilidad si lo marcas así
        );

        if (!isAdmin && Number(order.user_code) !== Number(user.user_code || user.sub)) {
            await t.rollback();
            return res.status(403).json({ status: 'error', message: 'No tienes permisos para cancelar este pedido' });
        }

        // Restaurar stock: coleccionar product_codes de los OrderItems
        const items = order.items || [];
        if (items.length > 0) {
            const productCodes = items.map(it => it.product_code);
            // Bloquear filas de producto
            const products = await Product.findAll({
                where: { product_code: productCodes },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            // Mapear y restaurar stock
            const prodMap = new Map(products.map(p => [p.product_code, p]));
            for (const it of items) {
                const prod = prodMap.get(it.product_code);
                if (prod) {
                    // Aumentar stock (restauración)
                    prod.stock = Number(prod.stock) + Number(it.quantity);
                    await prod.save({ transaction: t });
                } else {
                    // Producto no encontrado (posible inconsistencia), la dejamos pasar pero logueamos
                    console.warn(`[Orders][Cancel] Producto ${it.product_code} no encontrado al restaurar stock.`);
                }
            }
        }

        // Decidir estado de payment_status y payments dentro de DB:
        // - Para pagos en efectivo: marcamos como 'refunded' (se devolverá en caja).
        // - Para pagos por proveedor (mercadopago/card) dejaremos en 'pending' para procesar refund externo luego.
        let anyProviderPayment = false;
        if (order.payments && order.payments.length > 0) {
            for (const p of order.payments) {
                if (p.provider === 'cash') {
                    await p.update({ status: 'refunded' }, { transaction: t });
                } else {
                    // proveedor externo (mercadopago / card): marcaremos 'pending' y trataremos refund fuera de la tx
                    await p.update({ status: 'pending' }, { transaction: t });
                    anyProviderPayment = true;
                }
            }
        }

        // Actualizamos el Order: estado cancelled. payment_status:
        const payment_status_after = anyProviderPayment ? 'pending' : 'refunded';
        await order.update({ status: 'cancelled', payment_status: payment_status_after }, { transaction: t });

        // Commit DB: stock restaurado, order y payments marcados en DB
        await t.commit();

        // Fuera de la transacción: procesar reembolsos con proveedores externos (si corresponde)
        if (anyProviderPayment && MercadoPagoService) {
            // Recorremos los pagos con proveedor externo y llamamos al servicio de refund
            for (const p of order.payments.filter(pp => pp.provider !== 'cash')) {
                (async () => {
                    try {
                        // Intento de refund: adaptar api según tu servicio
                        const providerId = p.provider_payment_id;
                        if (!providerId) {
                            console.warn(`[Orders][Cancel] Payment ${p.payment_code} no tiene provider_payment_id, no se puede reembolsar automáticamente.`);
                            // Actualizar estado a 'rejected' o dejar como 'pending' para revisión manual
                            await Payment.update({ status: 'rejected' }, { where: { payment_code: p.payment_code } });
                            return;
                        }

                        // Intentar refund (implementa mercadoPago.refund en services/mercadoPago)
                        const refundResult = await MercadoPagoService.refund({ providerPaymentId: providerId, amount: p.amount, paymentId: p.payment_code });
                        if (refundResult && refundResult.status === 'success') {
                            await Payment.update({ status: 'refunded', raw_response: refundResult }, { where: { payment_code: p.payment_code } });
                        } else {
                            await Payment.update({ status: 'rejected', raw_response: refundResult }, { where: { payment_code: p.payment_code } });
                        }
                    } catch (err) {
                        console.error('[Orders][Cancel][Refund]', err);
                        // Intento fallido: marcar para revisión manual (podrías notificar al equipo)
                        try {
                            await Payment.update({ status: 'rejected' }, { where: { payment_code: p.payment_code } });
                        } catch (updErr) { console.error('[Orders][Cancel][Refund] update fail', updErr); }
                    }
                })();
            }
        }

        // Recargar la orden para devolver la representación más actual
        const updated = await Order.findByPk(order.order_code, {
            include: [{ model: Payment, as: 'payments' }, { model: OrderItem, as: 'items' }]
        });

        return res.status(200).json({
            status: 'success',
            message: 'Pedido cancelado correctamente',
            order: updated
        });

    } catch (err) {
        try { await t.rollback(); } catch (e) { /* noop */ }
        console.error('[Orders][CancelOrder]', err);
        return res.status(500).json({ status: 'error', message: 'Error interno al cancelar el pedido' });
    }
};
