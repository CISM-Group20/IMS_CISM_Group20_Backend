const express = require("express");
const router = express.Router();
const EvaluationFormDetails = require("../models/Evaluationformdetails");

const controller = require('../authcontrol/controller')
const mailer = require('../authcontrol/mailer')
const User = require("../models/user");
const Task = require("../models/task.js");
const middleware = require('../middleware/auth.js');

/*..........................................login.................................................... */
router.post("/login", controller.login);
router.post("/generateOTP&sendmail", middleware.localVariables, controller.generateOTP, mailer.sendingOTPMail);
router.get("/verifyOTP", controller.verifyOTP);
router.put("/resetPassword", controller.resetPassword);

/*..........................................registration.................................................... */
router.get('/users', controller.getUsers);
router.get('/user/:id', controller.getUserById);
router.delete('/users/:id', controller.deleteUser);
router.put('/users/:id', controller.changeRole);
router.post("/register", controller.register, mailer.sendWelcomeEmail);

/*..........................................project task part................................................ */
router.get('/taskinterns', controller.getInternsWithTasks);
router.get('/task', controller.getTask);
router.post('/task', controller.createTask);
router.delete('/task/:id', controller.deleteTask);
router.put('/task/:id', controller.updateTask);
router.get('/taskNotify', controller.getTasklistMentorNotification);
router.put('/taskVerify/:id', controller.getTaskVarify);
router.get('/task/:id', controller.getTaskIntern);

/*..........................................get intern list ................................................ */
router.get('/interns', controller.getInternList);

/*..........................................profile create................................................. */
router.put('/uploadImage', controller.uploadImageByuser);
router.get('/user', controller.getUser);
router.put("/updateuser", controller.updateuser);

/*..........................................SendeEmailToUsers................................................ */
router.post("/sendUserToEmail", controller.sendEmailToUsers, mailer.sendEmail);

/*..........................................secure................................................. */
router.put('/secure', controller.secure);

/*..........................................create intern profile................................................ */
router.get('/interns/:id', controller.getIntern);
router.put('/interns/:id', controller.updatedIntern);
router.put('/updateinterns', controller.updateinternprofile);

/*..........................................cv part................................................. */
router.put('/:userId/uploadcv', controller.uploadcvByAdmin);
router.put('/:userId/deletecv', controller.deletecvByAdmin);

/*........................................work schedule................................................*/
router.post('/workschedule', controller.createWorkSchedule);
router.delete('/schedule/:eventId', controller.deleteWorkSchedule);
router.get('/allusers', controller.fetchAllUsers);

/*......................................Leave............................................*/
router.post('/applyLeave', controller.applyLeave);
router.get('/getLeaveApplications', controller.getLeaveApplications);
router.put('/updateLeaveStatus', controller.updateLeaveStatus, mailer.sendEmailToAssignIntern);

/*..........................................evaluvation part admin................................................. */
router.get('/Evinterns', controller.getEvInterns);
router.get('/evaluators', controller.getEvaluators);
router.post('/evaluatorname', controller.postEvaluatorName);
router.delete('/deleteeformData', controller.deleteeformData);

/*..........................................evaluation mentor & evaluator................................................. */
router.get('/checkMentor', controller.getInternBymentor);
router.post('/storeMentorScores/:id', controller.storeMentorScoresById);
router.get('/getInternsByEvaluator', controller.getInternsByEvaluator);
router.post('/postEvaluatorResultById/:id', controller.storeEvaluatorResultById);
router.get('/getInternsForManager', controller.getInternsForManager);
router.get('/getAllMentors', controller.getAllMentors);
router.get('/getReviewDetailsById/:id', controller.getReviewDetailsById);
router.get('/getCommentsById', controller.getCommentsById);

module.exports = router;