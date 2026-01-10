// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to protect normal authenticated routes
 */
const auth = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            // If request wants HTML, redirect to login page
            if (req.accepts('html')) {
                return res.redirect('/login');
            }
            throw new Error('No token provided');
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) throw new Error('User not found');

        // Attach user and token to request
        req.user = user;
        req.token = token;

        next();
    } catch (error) {
        console.error('❌ Auth middleware error:', error.message);

        // HTML requests -> redirect to login
        if (req.accepts('html')) {
            return res.redirect('/login');
        }

        // API requests -> JSON 401
        res.status(401).json({ error: 'Please authenticate.' });
    }
};

/**
 * Middleware to protect admin-only routes
 */
const adminAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) throw new Error('No token provided');

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || !user.isAdmin) throw new Error('Admin required');

        req.user = user;
        req.token = token;

        next();
    } catch (error) {
        console.error('❌ Admin auth error:', error.message);

        if (req.accepts('html')) {
            return res.redirect('/login'); // Redirect HTML users to login
        }

        res.status(403).json({ error: 'Admin access required.' });
    }
};

module.exports = { auth, adminAuth };