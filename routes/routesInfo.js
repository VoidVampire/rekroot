const express = require("express");
const router = express.Router();
const User = require("../models/User");
const JobApplication = require("../models/Application");
const Company = require("../models/Company");
const JobPost = require("../models/JobPost");
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

router.use(express.json());

const checkCompanyOwnership = async (req, res, next) => {
  try {
    const companyID = req.params.companyID;
    const company = await Company.findById(companyID);
    if (!company || !(company.createdBy === req.user.user.id)) {
      console.log("Access Denied");
      return res.status(403).json({ message: "Forbidden: You are not the owner of this company" });
    }
    console.log("Access Granted");
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

const AuthMiddleware = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      res.status(401).json({ message: "No Token provided" });
    }
    else if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data) {
        throw error || new Error('Unauthorized');
      }
      req.user = data;
      next();
    }
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized', error });
  }
};

router.post('/sign-up', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email }).select('-_id email');
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }
    if (password.length < 6) {
      return res.status(401).json({ message: "Password length is less than 6" });
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { throw error; }
    await User.create({ _id: data.user.id, email });

    res.status(201).json({ message: 'Sign-up successful' });
  } catch (error) {
    res.status(500).json({ message: 'Sign-up failed', error });
  }
});

router.post('/sign-in', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid User" });
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error && error.message === "Invalid login credentials" && error.status === 401) {
      res.status(401).json({ message: "Wrong password" })
    }
    else if (error) { throw error; }
    res.status(200).json({ message: 'Sign-in successful', token: data.session.access_token });
  } catch (error) {
    res.status(500).json({ message: 'Sign-in failed', error });
  }
});

router.post('/sign-out', AuthMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) { throw error; }
    res.status(200).json({ message: 'Sign-out successful' });
  } catch (error) {
    res.status(400).json({ message: 'Sign-out failed', error: error });
  }
});

router.post('/delete-my-account', AuthMiddleware, async (req, res) => {
  try {
    const userId = req.user.user.id;
    await supabase.functions.invoke('delete-user');
    await User.findByIdAndDelete(userId);
    await Company.deleteMany({ createdBy: userId });
    const userJobPosts = await JobPost.find({ createdBy: userId });
    const jobPostIDs = userJobPosts.map(jobPost => jobPost._id);
    await JobApplication.deleteMany({ jobPost: { $in: jobPostIDs } });
    await JobPost.deleteMany({ createdBy: userId });
    await supabase.auth.signOut();
    res.status(200).json({ message: 'Account deleted successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting the account!', error: error.message });
  }
});

router.get('/me', AuthMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.user.id).select('fullName email');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/me/companies", AuthMiddleware, async (req, res) => {
  try {
    const userID = req.user.user.id;
    const companies = await Company.find({ createdBy: userID });
    const companyUUIDs = companies.map(company => company._id);
    res.status(200).json({ companyUUIDs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get("/me/applications", AuthMiddleware, async (req, res) => {
  try {
    const userID = req.user.user.id;

    const jobPosting = await JobPost.find({ createdBy: userID }).select('_id');
    const jobpostingIDs = jobPosting.map(posting => posting._id);

    const applications = await JobApplication.find({ jobPost: { $in: jobpostingIDs } }).select('_id');
    const applicationIds = applications.map(application => application._id);

    res.status(200).json({ applications: applicationIds });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/profile-edit", AuthMiddleware, async (req, res) => {
  try {
    const {
      fullName, password, email, phoneNo, location, linkedin, designation,
    } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid User" });
    }

    if (fullName) user.fullName = fullName;
    if (phoneNo) user.phoneNo = phoneNo;
    if (location) user.location = location;
    if (linkedin) user.linkedin = linkedin;
    if (designation) user.designation = designation;

    await user.save();
    await supabase.auth.updateUser({ password: password });
    res.status(200).json({ message: "Profile Updated successfully" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// router.post("/change-password", AuthMiddleware, async (req, res) => {
//   try {
//     const { password } = req.body;
//     await supabase.auth.updateUser({ password: password });
//     res.status(200).json({ message: "Password Updated successfully" });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ message: "Server Error" });
//   }
// });

router.post("/company", AuthMiddleware, async (req, res) => {
  try {
    const { companyName, companyWebsite, address, support_email } = req.body;
    const existingCompany = await Company.findOne({ companyName });
    if (existingCompany) {
      return res.status(400).json({ message: "Company already exists" });
    }
    const userID = req.user.user.id;
    const companyID = uuidv4();
    const company = await Company.create({ _id: companyID, companyName, companyWebsite, address, support_email, createdBy: userID });
    console.log("Company is created", company);
    res.status(201).json({ message: "Company is created Successfully" });
  }
  catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/company/:companyID/logo", AuthMiddleware, checkCompanyOwnership, async (req, res) => {
  try {
    const companyID = req.params.companyID;
    const company = await Company.findById({ companyID });
    const file = req.files.file;
    const fileBuffer = Buffer.from(file.data, 'binary');
    const base64Encoded = fileBuffer.toString('base64');

    if (fileBuffer.length > 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 1 MB. Please upload a smaller file.' });
    }
    if (file) {
      company.logo = base64Encoded;
    }
    await company.save();

    console.log("Company Logo is changed", company.logo);
    res.status(201).json({ message: "Company Logo is changed" });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get("/company/:companyID/logo", AuthMiddleware, async (req, res) => {
  try {
    const companyID = req.params.companyID;
    const company = await Company.findById({ companyID });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    if (!company.logo) {
      return res.status(404).json({ message: 'Logo not found for this company' });
    }
    const buffer = Buffer.from(company.logo, 'base64');
    res.contentType('image/png');
    res.end(buffer, 'binary');

  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get("/company/:companyID", AuthMiddleware, async (req, res) => {
  try {
    const companyID = req.params.companyID;
    const company = await Company.findById({ _id: companyID })
      .populate({
        path: 'createdBy',
        select: 'fullName -_id',
      });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.status(200).json({ company });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/posting', async (req, res) => {
  try {
    const companies = await Company.find({});
    let postingIDs = [];
    for (const company of companies) {
      const postings = await JobPost.find({ company: company._id }, '_id');
      const ids = postings.map(post => post._id);
      postingIDs = postingIDs.concat(ids);
    }
    res.json({ postingIDs });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
});

// router.get("/job-application", async (req, res) => {
//   try {
//     const jobApplications = await JobApplication.find();
//     res.status(200).json(jobApplications);
//   } catch (error) {
//     console.error("Error fetching job applications:", error);
//     res.status(500).json({ error: "Server Error" });
//   }
// });

// router.post("/job-application", async (req, res) => {
//   try {
//     const { fullname, email, education, exp, portfolio, github, linkedin, skills, progLang, currLoc, shiftToNew, slot } = req.body;
//     const formattedEducation = education.map((edu) => ({
//       eduLevel: edu.eduLevel,
//       schoolName: edu.schoolName,
//       passYear: edu.passYear,
//       cgpa: edu.cgpa
//     }));
//     const formattedExp = exp.map((expItem) => {
//       const fromDate = new Date(expItem.from);
//       const toDate = new Date(expItem.to);
//       const diffTime = Math.abs(toDate - fromDate);
//       const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365);
//       return {
//         from: fromDate,
//         to: toDate,
//         jobTitle: expItem.jobTitle,
//         yearsOfExp: Math.round(diffYears),
//       };
//     });
//     const newJobApplication = await JobApplication.create({ fullname, email, education: formattedEducation, exp: formattedExp, portfolio, github, linkedin, skills, progLang, currLoc, shiftToNew, slot });
//     console.log("Job Application Posted");
//     res.status(201).json({ message: "Job application submitted successfully", jobApplication: newJobApplication });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({ message: "Server Error" });
//   }
// });

router.get("/company/:companyID/postings", AuthMiddleware, async (req, res) => {
  try {
    const companyID = req.params.companyID;
    const company = await Company.findById( companyID );
    if (!company) {
      return res.status(404).json({ message: "No such company" });
    }
    const postings = await JobPost.find({ company: companyID }).select('_id');
    const postingIDs = postings.map(posting => posting._id);
    res.status(200).json({ postings: postingIDs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/company/:companyID/posting", AuthMiddleware, checkCompanyOwnership, async (req, res) => {
  try {
    const jobPost = await JobPost.create({
      _id: uuidv4(),
      job_title: req.body.job_title,
      location: req.body.location,
      job_type: req.body.job_type,
      description: req.body.description,
      salary_range: req.body.salary_range,
      company: req.params.companyID,
      createdBy: req.user.user.id
    });
    res.status(201).json({ message: "Job posting created successfully", jobPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/company/:companyID/posting/:postingID", AuthMiddleware, async (req, res) => {
  try {
    const companyID = req.params.companyID;
    const postingID = req.params.postingID;
    const companyExists = await Company.exists({ _id: companyID })
    if (!companyExists) {
      return res.status(404).json({ message: 'Company not found' });
    }
    const jobPosting = await JobPost.findOne({ _id: postingID, company: companyID })
      .populate({
        path: 'createdBy',
        select: 'fullName -_id',
      }).populate({
        path: 'company',
        select: 'companyName -_id',
      });
    if (!jobPosting) {
      return res.status(404).json({ message: 'Job posting not found' });
    }

    res.status(200).json({ jobPosting });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/company/:companyID/posting/:postingID/application/:applicationID", AuthMiddleware, async (req, res) => {
  try {
    const companyID = req.params.companyID;
    const postingID = req.params.postingID;
    const applicationID = req.params.applicationID;
    const userID = req.user.user.id;
    const company = await Company.findById(companyID);
    const jobPost = await JobPost.findById(postingID);
    if (!company || !jobPost) {
      return res.status(401).json({ message: "Forbidden: Invalid company or job post" });
    }
    if (!(jobPost.company === companyID)) {
      return res.status(402).json({ message: "Forbidden: Job Post does not belong to the specified company" });
    }
    const jobApplication = await JobApplication.findById(applicationID);
    if (!jobApplication || !(jobApplication.company === companyID) || !(jobApplication.jobPost === postingID)) {
      return res.status(403).json({ message: "Not Found: Job application not found or does not belong to the specified company and job post" });
    }
    if (!(jobApplication.applicantID === userID) && !(company.createdBy === userID)) {
      return res.status(405).json({ message: "Forbidden: You are not the applicant or owner of this company" });
    }
    res.status(200).json({ application: jobApplication });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/company/:companyID/posting/:postingID/application", AuthMiddleware, async (req, res) => {
  try {
    const companyID = req.params.companyID;
    const postingID = req.params.postingID;
    const applicantID = req.user.user.id;
    const company = await Company.findById(companyID);
    const jobPost = await JobPost.findById(postingID);
    if (!company || !jobPost) {
      return res.status(401).json({ message: "Forbidden: Invalid company or job post" });
    }
    if (company.createdBy === applicantID) {
      return res.status(402).json({ message: "Forbidden: You cannot apply to your own company." });
    }
    if (!(jobPost.company === companyID)) {
      return res.status(403).json({ message: "Forbidden: Job post does not belong to the specified company" });
    }
    const existingApplication = await JobApplication.findOne({
      jobPost: postingID,
      company: companyID,
      applicantID: applicantID
    });
    if (existingApplication) {
      return res.status(400).json({ message: "Sorry you can apply for this job only once" });
    }
    const newJobApplication = await JobApplication.create({
      _id: uuidv4(),
      applicantName: req.body.applicantName,
      applicantID: applicantID,
      email: req.body.email,
      phone: req.body.phone,
      education: req.body.education,
      workExperience: req.body.workExperience,
      resume: req.body.resume,
      coverLetter: req.body.coverLetter,
      linkedinProfile: req.body.linkedinProfile,
      githubProfile: req.body.githubProfile,
      portfolio: req.body.portfolio,
      skills: req.body.skills,
      currLoc: req.body.currLoc,
      shiftToNew: req.body.shiftToNew,
      slot: req.body.slot,
      references: req.body.references,
      customQuestions: req.body.customQuestions,
      jobPost: postingID,
      company: companyID
    });
    res.status(201).json({ message: "Job application created successfully", application: newJobApplication });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/company/:companyID/posting/:postingID/application', AuthMiddleware, checkCompanyOwnership, async (req, res) => {
  try {
    const companyID = req.params.companyID;
    const postingID = req.params.postingID;
    const applications = await JobApplication.find({ company: companyID, jobPost: postingID }, '_id');
    const applicationIDs = applications.map(info => info._id);
    return res.json({ applications: applicationIDs });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;