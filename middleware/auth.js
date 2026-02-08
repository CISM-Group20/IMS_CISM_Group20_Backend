// const User = require('../models/user');

/** 
 * Simplified Auth middleware - No JWT verification
 * Reads userId from 'x-user-id' header to identify the user.
 * This keeps req.data populated so controllers still work.
 */
// async function Auth(req, res, next) {
//     try {
//         const userId = req.headers['x-user-id'];
//         if (!userId) {
//             return res.status(400).json({ error: "x-user-id header is required" });
//         }
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ error: "User not found" });
//         }
//         // Populate req.data so controllers that use req.data.id still work
//         req.data = { id: user._id.toString(), email: user.email, role: user.role };
//         req.user = user;
//         next();
//     } catch (error) {
//         res.status(500).json({ error: "Server error in auth middleware" });
//     }
// }

// function localVariables(req, res, next) {
//     req.app.locals = {
//         OTP: null,
//         resetSession: false
//     };
//     next();
// }


function Auth(req, res, next) {
    // No authentication required — set dummy req.data and req.user
    // Controllers that use req.data.id will get null
    req.data = { id: null, email: null, role: null };
    req.user = null;
    next();
}

function localVariables(req, res, next) {
    req.app.locals = {
        OTP: null,
        resetSession: false
    };
    next();
}


// All role-based checks removed — every request is allowed through
function IsAdmin(req, res, next) { next(); }
function IsIntern(req, res, next) { next(); }
function IsMentor(req, res, next) { next(); }
function IsEvaluator(req, res, next) { next(); }
function IsManager(req, res, next) { next(); }
function IsEvaluatorORIsMentor(req, res, next) { next(); }
function IsNotIntern(req, res, next) { next(); }
function IsUser(req, res, next) { next(); }

module.exports = { Auth, localVariables, IsAdmin, IsIntern, IsMentor, IsEvaluator, IsManager, IsNotIntern, IsUser, IsEvaluatorORIsMentor };


