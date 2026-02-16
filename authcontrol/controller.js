const User = require("../models/user.js");
const EvaluationFormDetails = require('../models/Evaluationformdetails');
const otpGenerator = require("otp-generator");
const Task = require("../models/task.js");

/*..............................login page.............................................*/

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(401)
        .json({ loginStatus: false, msg: "Incorrect email" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ loginStatus: false, msg: "Incorrect password" });
    }

    const token = jwt.sign(
      { email: user.email, id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "3d" }
    );

    res.status(200).json({
      msg: "Login Successful...!",
      username: user.username,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ loginStatus: false, Error: "Internal Server Error" });
  }
};



/*generateOTP in 6 digit */
exports.generateOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res.json({ msg: "User not registered" });
    } else {
      const otp = await otpGenerator.generate(6, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
      });

      req.app.locals.OTP = otp;

      const otpTimeout = setTimeout(() => {
        req.app.locals.OTP = null;
      }, 1 * 60 * 1000);

      next();
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};


/* verifyOTP that email */
exports.verifyOTP = async (req, res) => {
  const { code } = req.query;

  if (parseInt(req.app.locals.OTP) === parseInt(code)) {
    req.app.locals.resetSession = true;
    res.status(201).send({ msg: "Verify Successsfully!" });
  } else {
    res.status(400).send({ msg: "Invalid OTP" });
  }

  req.app.locals.OTP = null;
};



/* reset password */
exports.resetPassword = async (req, res) => {
  try {
    if (!req.app.locals.resetSession)
      return res.status(440).json({ msg: "Session expired!" });

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.json({ message: "User not registered" });
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      await User.updateOne(
        {
          email: email,
        },
        {
          $set: {
            password: hashedPassword,
          },
        }
      );
      req.app.locals.resetSession = false; // reset session
      return res.status(201).json({ msg: "Record Updated...!" });
    } catch (error) {
      return res.status(500).json({ error });
    }
  } catch (error) {
    return res.status(401).json({ error: "Invalid Request" });
  }
};


/*.............................registation add user table............................*/

// Fetch all users from the user database
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(201).json({ success: true, users });
  } catch (error) {
    console.error(error);
    res.status(500).json("Internal Server Error");
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'user not found' });
    }
    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// deleteuser from the user database
// ✅ FIXED: removed req.data.id self-delete check
exports.deleteUser = async (req, res) => {
  try {
    let id = req.params.id;
    const user = await User.findByIdAndDelete(id);
    await Task.deleteMany({ _userId: id });
    await EvaluationFormDetails.deleteMany({ user: id });

    if (!user) {
      return res.status(404).json("User not found");
    }

    res.status(200).json({ msg: "User deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json("Internal Server Error");
  }
};


// changerole from the user database
// ✅ FIXED: removed req.data.id self-role-change check
exports.changeRole = async (req, res) => {
  const { role } = req.body;
  const { id } = req.params;
  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json("User not found");
    }

    if (user.role === role) {
      return res.status(400).json({ msg: "Role is already set to " + role });
    }
    await User.updateOne(
      { _id: id },
      { $set: { role: role } }
    );

    return res.status(201).json({ msg: "Record Updated...!" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};


//register user
// ✅ FIXED: removed console.log(req.data)
exports.register = async (req, res, next) => {
  try {
    const { fname, lname, dob, role, gender, email, password, jobtitle, employmentType, department } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ msg: "User already exists" });
    }
    const user = await User.create({
      fname, lname, dob, role, gender, email, password, jobtitle, employmentType, department,
    });

    res.locals.userData = { email, password, user };
    next();
  } catch (error) {
    console.error(error);
  }
};

/*..............................create user profile.............................. */
// ✅ FIXED: now uses req.query.userId instead of req.data.id
// Frontend must call: GET /api/user?userId=xxxxx
exports.getUser = async (req, res) => {
  try {
    const id = req.query.userId;
    if (!id) {
      return res.status(400).json({ error: "userId query parameter is required" });
    }
    const user = await User.findById(id);
    res.status(201).json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};


// ✅ FIXED: now uses req.body.userId instead of req.data.id
exports.updateuser = async (req, res) => {
  const id = req.body.userId;
  if (!id) {
    return res.status(400).json({ error: "userId is required in body" });
  }
  try {
    const body = req.body;
    const result = await User.updateOne({ _id: id }, body);

    if (result.nModified === 0) {
      return res.status(404).send({ error: "User not found or no changes applied" });
    }
    return res.status(200).send({ msg: "Record Updated" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

// ✅ FIXED: now uses req.body.userId instead of req.data.id
exports.uploadImageByuser = async (req, res) => {
  const id = req.body.userId;
  if (!id) {
    return res.status(400).json({ error: "userId is required in body" });
  }
  try {
    const updateduser = await User.findByIdAndUpdate(id, req.body, { new: true });
    if (!updateduser) {
      return res.status(404).json({ message: 'user not found' });
    }
    res.json({ msg: "update successfully", updateduser });
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

/*......................................intern table create.......................*/
// Read Intern Users
exports.getInternList = async (req, res) => {
  try {
    const interns = await User.find({ role: 'intern' });
    res.status(201).json({ success: true, interns });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get Intern by ID
exports.getIntern = async (req, res) => {
  try {
    const intern = await User.findById(req.params.id);
    if (!intern) {
      return res.status(404).json({ message: 'Intern not found' });
    }
    res.status(201).json({ success: true, intern });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update Intern User
exports.updatedIntern = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedIntern = await User.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedIntern) {
      return res.status(404).json({ message: 'Intern user not found' });
    }
    res.json({ msg: "update successfully", updatedIntern });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


exports.getAllMentors = async (req, res) => {
  try {
    const mentors = await User.find({ role: 'mentor' }, 'fname lname email').lean();
    const mentorsWithFullName = mentors.map(mentor => ({
      fullName: mentor.fname + ' ' + mentor.lname,
      email: mentor.email
    }));
    res.json(mentorsWithFullName);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/*......................................intern profile create.......................*/
// ✅ FIXED: now uses req.body.userId instead of req.data.id
exports.updateinternprofile = async (req, res) => {
  const id = req.body.userId;
  if (!id) {
    return res.status(400).json({ error: "userId is required in body" });
  }
  try {
    const body = req.body;
    const result = await User.updateOne({ _id: id }, body);
    if (result.nModified === 0) {
      return res.status(404).send({ error: "User not found or no changes applied" });
    }
    return res.status(200).send({ msg: "Record Updated" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};


/*......................................project details.......................*/

exports.getInternsWithTasks = async (req, res) => {
  try {
    const tasks = await Task.find();
    const userIds = [...new Set(tasks.map(task => task._userId.toString()))];
    const interns = await User.find({
      _id: { $in: userIds },
      role: 'intern'
    });
    if (!interns.length) {
      return res.status(404).json({ message: 'No interns with tasks found' });
    }
    res.status(200).json({ success: true, interns });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ✅ FIXED: now uses req.query.userId instead of req.data.id
// Frontend must call: GET /api/task?userId=xxxxx
exports.getTask = async (req, res) => {
  const id = req.query.userId;
  if (!id) {
    return res.status(400).json({ error: "userId query parameter is required" });
  }
  Task.find({ _userId: id }).then((tasks) => {
    res.json(tasks);
  }).catch((e) => {
    res.json(e);
  });
};


// ✅ FIXED: now uses req.body.userId instead of req.data.id
exports.createTask = async (req, res) => {
  const id = req.body.userId;
  if (!id) {
    return res.status(400).json({ error: "userId is required in body" });
  }
  let title = req.body.title;
  try {
    const task = await Task.create({
      title: title,
      _userId: id
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    let id = req.params.id;
    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return res.status(404).json("task not found");
    }
    res.status(200).send({ msg: "task deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};


// ✅ FIXED: now uses req.body.mentorEmail instead of req.user.mentorEmail
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedtask = await Task.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedtask) {
      return res.status(404).json({ message: 'task not found' });
    }

    if (updatedtask.isComplete && req.body.mentorEmail) {
      updatedtask.mentorEmail = req.body.mentorEmail;
      await updatedtask.save();
    }
    if (!updatedtask.isComplete) {
      updatedtask.mentorEmail = null;
      await updatedtask.save();
    }

    res.json({ msg: "update successfully", updatedtask });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


// ✅ FIXED: now uses req.query.email instead of req.user.email
// Frontend must call: GET /api/taskNotify?email=xxxxx
exports.getTasklistMentorNotification = async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).json({ error: "email query parameter is required" });
    }
    const tasks = await Task.find({ mentorEmail: email, isComplete: true })
      .populate('_userId');
    if (!tasks) {
      return res.status(404).json({ message: 'task not found' });
    }
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTaskVarify = async (req, res) => {
  const id = req.params.id;
  try {
    const varifytask = await Task.findByIdAndUpdate(id, req.body, { new: true });
    if (!varifytask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (!varifytask.isVerified) {
      varifytask.isComplete = false;
      await varifytask.save();
    }
    res.json({ msg: "update successfully ", varifytask });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTaskIntern = async (req, res) => {
  const { id } = req.params;
  Task.find({ _userId: id }).then((tasks) => {
    res.json(tasks);
  }).catch((e) => {
    res.send(e);
  });
};


// ✅ FIXED: now uses req.body.userId instead of req.data.id
exports.secure = async (req, res) => {
  const id = req.body.userId;
  if (!id) {
    return res.status(400).json({ error: "userId is required in body" });
  }
  const { Oldpassword, Newpassword } = req.body;
  try {
    const user = await User.findById(id);
    if (Oldpassword !== user.password) {
      return res.status(400).send({ msg: "Invalid old password." });
    }
    await User.updateOne(
      { _id: id },
      { $set: { password: Newpassword } }
    );
    return res.status(201).send({ msg: "Record Updated...!" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ msg: "Internal Server Error" });
  }
};

/*......................................cv upload.......................*/

exports.uploadcvByAdmin = async (req, res) => {
  const { cvUrl } = req.body;
  const { userId } = req.params;
  if (!cvUrl || !userId) {
    return res.status(400).json({ msg: "Please provide both cvfileURL and userId" });
  }
  try {
    const updateduser = await User.findByIdAndUpdate(userId, { cvUrl }, { new: true });
    if (!updateduser) {
      return res.status(404).json({ message: 'user not found' });
    }
    res.json({ msg: "Update cv file successfully", updateduser });
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

exports.deletecvByAdmin = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.cvUrl === null) {
      return res.json({ msg: "CV URL is null", user });
    }
    await User.updateOne({ _id: userId }, { cvUrl: null });
    user.cvUrl = null;
    res.json({ msg: "CV URL deleted", user });
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

/*......................................work schedule.......................*/

// ✅ FIXED: now uses req.body.userId instead of req.data.id
exports.createWorkSchedule = async (req, res) => {
  const id = req.body.userId;
  if (!id) {
    return res.status(400).json({ error: "userId is required in body" });
  }
  const { schedules: newSchedules } = req.body;
  try {
    const user = await User.findById(id);
    const updatedSchedules = [...user.schedules, ...newSchedules];
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { schedules: updatedSchedules },
      { new: true }
    );
    res.json({ msg: "Schedules updated successfully", updatedUser });
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

// ✅ FIXED: now uses req.query.userId instead of req.data.id
// Frontend must call: DELETE /api/schedule/:eventId?userId=xxxxx
exports.deleteWorkSchedule = async (req, res) => {
  const id = req.query.userId;
  if (!id) {
    return res.status(400).json({ error: "userId query parameter is required" });
  }
  const { eventId } = req.params;
  try {
    await User.updateOne({ _id: id }, { $pull: { schedules: { _id: eventId } } });
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error("Error deleting work schedule:", error.message);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

exports.fetchAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error(error);
    res.status(500).json("Internal Server Error");
  }
};

/*......................................Leave............................................*/
// ✅ FIXED: now uses req.body.userId instead of req.data.id
exports.applyLeave = async (req, res) => {
  const id = req.body.userId;
  if (!id) {
    return res.status(400).json({ error: "userId is required in body" });
  }
  const { leaveDate, reason } = req.body;
  if (!leaveDate || !reason) {
    return res.status(400).json({ message: 'Please provide leaveDate and reason.' });
  }
  try {
    const leaveApplication = { leaveDate, reason };
    await User.updateOne({ _id: id }, { $push: { leaveApplications: leaveApplication } });
    res.status(201).json({ message: 'Leave application submitted successfully', leaveApplication });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getLeaveApplications = async (req, res) => {
  try {
    const usersWithLeaveApplications = await User.find({ leaveApplications: { $exists: true, $not: { $size: 0 } } })
      .select('leaveApplications fname lname jobtitle imageUrl')
      .lean();
    const leaveApplications = usersWithLeaveApplications.flatMap(user =>
      user.leaveApplications.map(application => ({
        ...application,
        user: { userid: user._id, fname: user.fname, lname: user.lname, jobtitle: user.jobtitle, imageUrl: user.imageUrl }
      }))
    );
    res.status(200).json({ leaveApplications });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// ✅ FIXED: removed req.data.id self-check
exports.updateLeaveStatus = async (req, res, next) => {
  const { userId, leaveApplicationId, status } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const leaveApplication = user.leaveApplications.id(leaveApplicationId);
    if (!leaveApplication) {
      return res.status(404).json({ message: 'Leave application not found' });
    }

    await User.updateOne(
      { _id: userId },
      { $set: { "leaveApplications.$[elem].status": status } },
      { arrayFilters: [{ "elem._id": leaveApplicationId }] }
    );

    if (status === 'Approved' && user.role === 'mentor') {
      const leavedate = leaveApplication.leaveDate;
      const mentoremail = user.email;
      const mentorname = user.fname + " " + user.lname;
      const users = await User.find({ mentorEmail: mentoremail, role: 'intern' });
      res.locals.userData = { mentoremail, leavedate, mentorname, users };
      return next();
    }
    res.status(200).json({ message: 'Leave status updated successfully', leaveApplication });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


/*......................................send email to user.......................*/
// ✅ FIXED: now uses req.body.senderEmail instead of req.user.email
exports.sendEmailToUsers = async (req, res, next) => {
  const { email, subject, message, senderEmail } = req.body;
  try {
    const UserEmail = senderEmail || 'unknown@example.com';
    const emailUser = await User.findOne({ email });
    if (!emailUser) {
      return res.status(403).json({ msg: "user not found" });
    }
    res.locals.userData = { email, subject, message, UserEmail };
    next();
  } catch (error) {
    console.error(error);
  }
};


/*......................................evaluvation......................*/
exports.getEvInterns = async (req, res) => {
  try {
    const users = await User.find({ role: "intern" }).lean();

    const promises = users.map(async (user) => {
      let evaluationFormDetails = await EvaluationFormDetails.findOne({
        user: user._id,
      }).lean();

      if (!evaluationFormDetails) {
        evaluationFormDetails = new EvaluationFormDetails({
          user: user._id,
          evaluator: " ",
          overall_performance_mentor: 0,
          overall_performance_evaluator: 0,
          action_taken_mentor: " ",
          comment_mentor: " ",
          comment_evaluator: " ",
          evaluate_before: new Date(),
        });
        await evaluationFormDetails.save();
      }

      return {
        name: user.fname + " " + user.lname,
        mentor: user.mentor,
        eformStatus: evaluationFormDetails ? evaluationFormDetails.eformstates : null,
        evaluationFormDetailsId: evaluationFormDetails ? evaluationFormDetails._id : null,
        imageUrl: user.imageUrl
      };
    });

    const userDetails = await Promise.all(promises);
    const internIds = users.map((user) => user._id);
    await EvaluationFormDetails.deleteMany({ user: { $nin: internIds } });
    res.json(userDetails);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEvaluators = async (req, res) => {
  try {
    const evaluators = await User.find({ role: { $in: ['evaluator'] } }, '_id fname lname email').lean();
    const evaluatorDetails = evaluators.map(evaluator => ({
      id: evaluator._id,
      name: evaluator.fname + ' ' + evaluator.lname,
      email: evaluator.email
    }));
    res.json(evaluatorDetails);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.postEvaluatorName = async (req, res) => {
  try {
    const { id, evaluatorName, evaluatorEmail, evaluatorId, jobPerformanceCriteriasEvaluator, coreValuesCriteriasEvaluator, jobPerformanceCriteriasMentor, coreValuesCriteriasMentor, evaluateBefore } = req.body;
    const allFieldsFilled = evaluatorName && evaluatorEmail && jobPerformanceCriteriasEvaluator && coreValuesCriteriasEvaluator && jobPerformanceCriteriasMentor && coreValuesCriteriasMentor && evaluateBefore;

    const updatedDocument = await EvaluationFormDetails.findByIdAndUpdate(id,
      {
        evaluator: evaluatorName,
        evaluator_email: evaluatorEmail,
        evaluator_id: evaluatorId,
        job_performance_criterias_evaluator: jobPerformanceCriteriasEvaluator,
        core_values_criterias_evaluator: coreValuesCriteriasEvaluator,
        job_performance_criterias_mentor: jobPerformanceCriteriasMentor,
        core_values_criterias_mentor: coreValuesCriteriasMentor,
        evaluate_before: evaluateBefore ? new Date(evaluateBefore) : undefined,
        eformstates: allFieldsFilled ? 'created' : 'not created'
      },
      { new: true }).lean();

    res.json(updatedDocument);
  } catch (err) {
    console.error('Error details:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteeformData = async (req, res) => {
  try {
    const { id } = req.body;
    const updatedDocument = await EvaluationFormDetails.findByIdAndUpdate(id,
      {
        evaluator: '',
        job_performance_criterias_evaluator: [],
        core_values_criterias_evaluator: [],
        job_performance_criterias_mentor: [],
        core_values_criterias_mentor: [],
        job_performance_scores_evaluator: [],
        core_values_scores_evaluator: [],
        job_performance_scores_mentor: [],
        core_values_scores_mentor: [],
        overall_performance_mentor: null,
        overall_performance_evaluator: null,
        action_taken_mentor: '',
        comment_evaluator: '',
        comment_mentor: '',
        evaluate_before: null,
        evaluated_date_Evaluator: null,
        evaluated_date_Mentor: null,
        eformstates: 'not created'
      },
      { new: true }).lean();

    res.json(updatedDocument);
  } catch (err) {
    console.error('Error details:', err);
    res.status(500).json({ error: err.message });
  }
};


/*......................................mentors page apis.......................*/
// ✅ FIXED: now uses req.query.userId instead of req.data.id
// Frontend must call: GET /api/checkMentor?userId=xxxxx
exports.getInternBymentor = async (req, res) => {
  try {
    const id = req.query.userId;
    if (!id) {
      return res.status(400).json({ error: "userId query parameter is required" });
    }
    const user = await User.findById(id).lean();
    const mentorEmail = user.email;
    const users = await User.find({ mentorEmail: mentorEmail }).lean();

    const mentorDetails = [];
    for (let u of users) {
      const evaluationFormDetails = await EvaluationFormDetails.find({
        eformstates: "created",
        user: u._id,
      }).lean();
      for (let doc of evaluationFormDetails) {
        const isMentorFormFilled =
          (doc.job_performance_scores_mentor?.length || 0) > 0 &&
          (doc.core_values_scores_mentor?.length || 0) > 0 &&
          doc.overall_performance_mentor > 0 &&
          doc.action_taken_mentor !== "" &&
          doc.comment_mentor !== "";
        mentorDetails.push({
          internName: u.fname + " " + u.lname,
          evaluateBefore: doc.evaluate_before,
          eformstates: doc.eformstates,
          jobPerformanceCriteriasEvaluator: doc.job_performance_criterias_evaluator,
          coreValuesCriteriasEvaluator: doc.core_values_criterias_evaluator,
          jobPerformanceCriteriasMentor: doc.job_performance_criterias_mentor,
          coreValuesCriteriasMentor: doc.core_values_criterias_mentor,
          evaluator: doc.evaluator,
          internId: doc._id,
          isMentorFormFilled: isMentorFormFilled,
          imageUrl: u.imageUrl
        });
      }
    }

    res.json(mentorDetails);
  } catch (err) {
    console.error("Error details:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.storeMentorScoresById = async (req, res) => {
  const {
    coreValuesScoresMentor,
    jobPerformanceScoresMentor,
    overall_performance_mentor = null,
    action_taken_mentor = null,
    comment_mentor = null
  } = req.body;
  const { id } = req.params;

  try {
    let evaluationFormDetails = await EvaluationFormDetails.findById(id);
    if (!evaluationFormDetails) {
      return res.status(404).json({ message: 'No evaluation form found for this intern' });
    }

    evaluationFormDetails.core_values_scores_mentor = coreValuesScoresMentor;
    evaluationFormDetails.job_performance_scores_mentor = jobPerformanceScoresMentor;
    evaluationFormDetails.overall_performance_mentor = overall_performance_mentor;
    evaluationFormDetails.action_taken_mentor = action_taken_mentor;
    evaluationFormDetails.comment_mentor = comment_mentor;
    evaluationFormDetails.evaluated_date_Mentor = new Date();
    await evaluationFormDetails.save();

    res.json({ message: 'Scores stored successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send(`Server error: ${err.message}`);
  }
};

// ✅ FIXED: now uses req.query.userId instead of req.data.id
// Frontend must call: GET /api/getInternsByEvaluator?userId=xxxxx
exports.getInternsByEvaluator = async (req, res) => {
  try {
    const id = req.query.userId;
    if (!id) {
      return res.status(400).json({ error: "userId query parameter is required" });
    }
    const evaluationFormDetails = await EvaluationFormDetails.find({ evaluator_id: id }).lean();
    const userIds = evaluationFormDetails.map((doc) => doc.user);
    const users = await User.find({ _id: { $in: userIds } }).lean();

    const internDetails = users.map((user) => {
      const userFormDetails = evaluationFormDetails.find((doc) => doc.user.toString() === user._id.toString());
      const isEvaluated = userFormDetails && Array.isArray(userFormDetails.job_performance_scores_evaluator) && userFormDetails.job_performance_scores_evaluator.length > 0 && Array.isArray(userFormDetails.core_values_scores_evaluator) && userFormDetails.core_values_scores_evaluator.length > 0 && typeof userFormDetails.overall_performance_evaluator === "number" && typeof userFormDetails.comment_evaluator === "string";

      return {
        id: user._id,
        name: user.fname + " " + user.lname,
        evaluate_before: userFormDetails ? userFormDetails.evaluate_before : null,
        job_performance_criterias_evaluator: userFormDetails ? userFormDetails.job_performance_criterias_evaluator : null,
        core_values_criterias_evaluator: userFormDetails ? userFormDetails.core_values_criterias_evaluator : null,
        evaluationFormDetailsId: userFormDetails ? userFormDetails._id : null,
        isEvaluated: isEvaluated,
        imageUrl: user.imageUrl,
      };
    });

    res.json(internDetails);
  } catch (err) {
    console.error("Error details:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getInternsForManager = async (req, res) => {
  try {
    const interns = await User.find({ role: "intern" }).lean();

    const internsWithDetails = await Promise.all(
      interns.map(async (intern) => {
        const evaluationFormDetails = await EvaluationFormDetails.findOne({
          user: intern._id,
        }).lean();

        if (!evaluationFormDetails) {
          return null;
        }

        const fields = [
          "job_performance_criterias_evaluator",
          "core_values_criterias_evaluator",
          "job_performance_criterias_mentor",
          "core_values_criterias_mentor",
          "job_performance_scores_evaluator",
          "core_values_scores_evaluator",
          "job_performance_scores_mentor",
          "core_values_scores_mentor",
          "overall_performance_mentor",
          "overall_performance_evaluator",
          "action_taken_mentor",
          "comment_evaluator",
          "comment_mentor",
        ];
        const fieldsAreFilled = fields.every((field) => {
          const value = evaluationFormDetails[field];
          return Array.isArray(value) ? value.length > 0 : Boolean(value);
        });

        if (fieldsAreFilled) {
          return { ...intern, evaluationFormDetails };
        } else {
          return null;
        }
      })
    );

    const filteredInternsWithDetails = internsWithDetails.filter(Boolean);
    res.json(filteredInternsWithDetails);
  } catch (err) {
    console.error("Error details:", err);
    res.status(500).json({ error: err.message });
  }
};


// ✅ FIXED: now uses req.query.userId instead of req.data.id
// Frontend must call: GET /api/getCommentsById?userId=xxxxx
exports.getCommentsById = async (req, res) => {
  try {
    const id = req.query.userId;
    if (!id) {
      return res.status(400).json({ error: "userId query parameter is required" });
    }

    const evaluationFormDetails = await EvaluationFormDetails.findOne({ user: id })
      .populate('user', 'fname lname dob role email gender jobtitle employmentType mentor')
      .select("comment_evaluator overall_performance_mentor overall_performance_evaluator action_taken_mentor comment_mentor evaluated_date_Evaluator evaluated_date_Mentor evaluator");

    if (!evaluationFormDetails) {
      return res.status(404).json({
        message: "Evaluation form details not found for the given user ID",
      });
    }

    const fieldsToCheck = ['comment_evaluator', 'overall_performance_mentor', 'overall_performance_evaluator', 'action_taken_mentor', 'comment_mentor', 'evaluated_date_Evaluator', 'evaluated_date_Mentor'];
    let isEvaluated = true;
    for (const field of fieldsToCheck) {
      if (!evaluationFormDetails[field]) {
        isEvaluated = false;
        break;
      }
    }

    res.json({ ...evaluationFormDetails.toObject(), isEvaluated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getReviewDetailsById = async (req, res) => {
  try {
    const { id } = req.params;
    const evaluationDetails = await EvaluationFormDetails.findOne(
      { _id: id },
      "job_performance_criterias_evaluator core_values_criterias_evaluator job_performance_criterias_mentor core_values_criterias_mentor job_performance_scores_evaluator core_values_scores_evaluator job_performance_scores_mentor core_values_scores_mentor overall_performance_mentor overall_performance_evaluator action_taken_mentor comment_evaluator comment_mentor evaluated_date_Evaluator evaluated_date_Mentor evaluator evaluator_email evaluate_before"
    );

    if (!evaluationDetails) {
      return res
        .status(404)
        .json({ message: "Evaluation details not found for the given ID" });
    }

    res.json(evaluationDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.storeEvaluatorResultById = async (req, res) => {
  try {
    const id = req.params.id;

    const evaluationFormDetails = await EvaluationFormDetails.findById(id).lean();

    if (!evaluationFormDetails) {
      return res.status(404).json({ error: "Evaluation form not found" });
    }

    const updatedFormDetails = await EvaluationFormDetails.findByIdAndUpdate(
      id,
      {
        job_performance_scores_evaluator: req.body.job_performance_scores_evaluator,
        core_values_scores_evaluator: req.body.core_values_scores_evaluator,
        overall_performance_evaluator: req.body.overall_performance_evaluator,
        comment_evaluator: req.body.comment_evaluator,
        evaluated_date_Evaluator: new Date(),
      },
      { new: true }
    );

    res.json(updatedFormDetails);
  } catch (err) {
    console.error("Error details:", err);
    res.status(500).json({ error: "An error occurred while updating the evaluation form" });
  }
};