require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const userRoute = require("./routes/usersRoute.js");
const logger = require("./utils/logger.js");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const body = require("body-parser");
const app = express();

const connectDB = require("./utils/db.js");
connectDB();

//implement  HELMET
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://firebasestorage.googleapis.com"],
        connectSrc: [
          "'self'",
          "https://imsfrontend.vercel.app",
          "http://localhost:5173",
        ],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

// implement CORS
const allowedOrigins = [
  "https://imsfrontend.vercel.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        logger.warn(`CORS block - Origin: ${origin}`);
        return callback(new Error("CORS not allowed"), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  }),
);

app.use(express.json({limit: "10mb"}));
app.use(express.urlencoded({extended: true, limit: "10mb"}));
app.use(body.json());
app.use(cookieParser());

// implement RATE LIMITING
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {error: "Too many requests, please try again later."},
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const trustedIPs = ["127.0.0.1", "::1"];
    return trustedIPs.includes(req.ip);
  },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {error: "Too many login attempts, please try again later."},
  skipSuccessfulRequests: true,
});

//Apply rate limiters
app.use("/api/users/login", authLimiter);
app.use("/api/users/generateOTP&sendmail", authLimiter);
app.use("/api/users/verifyOTP", authLimiter);
app.use("/api/users/resetPassword", authLimiter);

app.set("view engine", "ejs");

//implement LOGGING
app.use(
  morgan("combined", {
    stream: {
      write: (message) => {
        const trimmed = message.trim();
        if (trimmed.includes(" 2")) {
          logger.info(trimmed);
        } else if (trimmed.includes(" 4")) {
          logger.warn(trimmed);
        } else if (trimmed.includes(" 5")) {
          logger.error(trimmed);
        } else {
          logger.http(trimmed);
        }
      },
    },
    skip: (req, res) => false,
  }),
);

app.use(express.static("Public"));
app.use("/api/users", userRoute);

app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  res.status(500).json({error: "Internal server error"});
});

app.use((req, res) => {
  logger.warn(`404 - ${req.method} ${req.path}`);
  res.status(404).json({error: "Route not found"});
});

const PORT = process.env.PORT || 8011;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  logger.info(`Server started on port ${PORT}`);
});
