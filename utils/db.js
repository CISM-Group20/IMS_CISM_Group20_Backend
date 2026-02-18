const  mongoose  = require("mongoose");
var mongoURL = process.env.DBUrl;

const mongoSanitize = require('express-mongo-sanitize');

const connectDB = async() => {
        try {
           mongoose.set("strictQuery", false);
           // Sanitize mongoURL
           mongoURL = mongoSanitize.sanitize(mongoURL);
            await mongoose.connect(mongoURL);
            console.log('mongodb connection SUCCESS');
        } catch (error) {
            console.log('mongodb connection FAIL');
            // Controlled error response
            if (error instanceof mongoSanitize.MongoSanitizeError) {
                console.log('Suspicious input detected in DB connection string.');
            } else {
                console.log('Database connection error.');
            }
            process.exit(1);
        }
   
   }
   
   module.exports = connectDB;
