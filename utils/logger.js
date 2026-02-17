const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  security: 5, // Custom level for security events
};

// Define log colors
winston.addColors({
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
  security: "cyan",
});

// Custom format for security logs
const securityFormat = winston.format((info) => {
  if (info.level === "security") {
    info.timestamp = new Date().toISOString();
    // Ensure no sensitive data is logged
    if (info.password) delete info.password;
    if (info.token) delete info.token;
  }
  return info;
});

// Create the logger
const logger = winston.createLogger({
  levels,
  format: winston.format.combine(
    securityFormat(),
    winston.format.timestamp({format: "YYYY-MM-DD HH:mm:ss"}),
    winston.format.errors({stack: true}),
    winston.format.json(),
  ),
  transports: [
    // Security events log (append-only, tamper-resistant)
    new DailyRotateFile({
      filename: path.join(__dirname, "../logs/security-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "30d",
      level: "security",
      format: winston.format.combine(
        winston.format.uncolorize(),
        winston.format.json(),
      ),
    }),

    // Error log
    new DailyRotateFile({
      filename: path.join(__dirname, "../logs/error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "30d",
      level: "error",
    }),

    // Combined log
    new DailyRotateFile({
      filename: path.join(__dirname, "../logs/combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "30d",
    }),
  ],
});

// Add console logging in development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({all: true}),
        winston.format.simple(),
      ),
    }),
  );
}

// Security event logging helper
logger.security = (event, details = {}) => {
  logger.log({
    level: "security",
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

module.exports = logger;
