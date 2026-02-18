const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { param, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const mongoSanitize = require('express-mongo-sanitize');

/** auth middleware */
async function Auth(req, res, next){
    try {
        // access authorize header to validate request
        const token = req.headers.authorization.split(" ")[1];
        // retrive the user details fo the logged in user
        const decodedToken = await jwt.verify(token, process.env.JWT_SECRET);

        req.data = decodedToken;
        console.log("decodedToken");
        console.log(decodedToken);    

        if (req.data && req.data.id && !mongoose.Types.ObjectId.isValid(req.data.id)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        next()

    } catch (error) {
        res.status(401).json({ error : "Authentication Failed!"})
    }
} 

function localVariables(req, res, next){
    req.app.locals = {
        OTP : null,
        resetSession : false
    }
    next();
}

// Helper to reduce duplication
async function checkRole(req, res, next, allowedRoles, attachUser = false, custom403Msg = null) {
    const { id } = req.data;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid user ID" });
    }
    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ msg: custom403Msg || "You do not have permission to access this function" });
    }
    if (attachUser) req.user = user;
    next();
}

function IsAdmin(req, res, next) {
    checkRole(req, res, next, ["admin"]);
}

function IsIntern(req, res, next) {
    checkRole(req, res, next, ["intern"], true);
}

function IsMentor(req, res, next) {
    checkRole(req, res, next, ["mentor"], true);
}

function IsEvaluator(req, res, next) {
    checkRole(req, res, next, ["evaluator"]);
}

function IsManager(req, res, next) {
    checkRole(req, res, next, ["manager"]);
}

function IsEvaluatorORIsMentor(req, res, next) {
    checkRole(req, res, next, ["evaluator", "mentor", "admin"]);
}

function IsNotIntern(req, res, next) {
    checkRole(
        req,
        res,
        next,
        ["admin", "mentor", "evaluator", "manager"],
        true,
        "You are not authorized to set this data"
    );
}

async function IsUser(req, res, next){
    const {id} = req.data;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid user ID" });
    }
    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    req.user = user;
    next();
}

module.exports = {
    Auth,
    localVariables,
    IsAdmin,
    IsIntern,
    IsMentor,
    IsEvaluator,
    IsManager,
    IsNotIntern,
    IsUser,
    IsEvaluatorORIsMentor
};


