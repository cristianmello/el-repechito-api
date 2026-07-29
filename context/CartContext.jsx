// src/context/CartContext.jsx  
import React, { createContext, useContext, useState, useMemo } from "react";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                return prev.map(i =>
                    i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id, delta) => {
        setCart(prev =>
            prev
                .map(i => i.id === id ? { ...i, quantity: i.quantity + delta } : i)
                .filter(i => i.quantity > 0)
        );
    };

    const cartCount = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);

    return (
        <CartContext.Provider value={{ cart, cartCount, isCartOpen, setIsCartOpen, addToCart, updateQuantity }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
    return ctx;
};
