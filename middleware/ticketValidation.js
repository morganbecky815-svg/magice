// middleware/ticketValidation.js
const { body } = require('express-validator');

const ticketValidationRules = () => {
    return [
        body('subject')
            .trim()
            .notEmpty().withMessage('Subject is required')
            .isLength({ min: 5, max: 200 }).withMessage('Subject must be between 5 and 200 characters'),
        
        body('category')
            .trim()
            .notEmpty().withMessage('Category is required')
            .isIn(['account', 'wallet', 'buying', 'selling', 'technical', 'security', 'other'])
            .withMessage('Invalid category'),
        
        body('description')
            .trim()
            .notEmpty().withMessage('Description is required')
            .isLength({ min: 10, max: 5000 }).withMessage('Description must be between 10 and 5000 characters'),
        
        body('email')
            .trim()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Invalid email address')
            .normalizeEmail(),
        
        body('transactionHash')
            .optional()
            .trim()
            .matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Invalid transaction hash format'),
        
        body('urgent')
            .optional()
            .isBoolean().withMessage('Urgent must be a boolean value')
    ];
};

module.exports = {
    ticketValidationRules
};