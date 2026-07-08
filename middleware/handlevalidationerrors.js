// src/middleware/handleValidationErrors.js (CORREGIDO)
const { validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);

        const combinedMessage = errorMessages.join('. ');

        return res.status(400).json({
            status: 'error',
            message: combinedMessage, 
            errors: errors.array() 
        });
    }

    next();
};

module.exports = handleValidationErrors;