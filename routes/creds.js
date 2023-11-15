const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const expressJwt = require('express-jwt');
const cookieParser = require("cookie-parser");
const User = require("../models/User");
const JobApplication = require("../models/Application");
const Company = require("../models/Company");
const JobPost = require("../models/JobPost");
const jwtSecret = process.env.JWT_SECRET;
const { v4: uuidv4 } = require('uuid');

const authMiddleware = expressJwt({
  secret: jwtSecret,
  getToken: function fromHeaderOrQueryString(req) {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
      return req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      return req.query.token;
    }
    return null;
  }
}).unless({ path: ['/sign-up', '/sign-in', "/"] });

const checkCompanyOwnership = async (req, res, next) => {
  try {
    const companyId = req.params.id;
    const userId = req.user.userId;
    const company = await Company.findById(companyId);
    if (!company || !company.createdBy.equals(userId)) {
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

router.use(authMiddleware);
router.use(express.json());
router.use(cookieParser());

router.get("/me", async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('fullName email');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/sign-up", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email }).select('-_id email');
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 7);
    const user = await User.create({ email, password: hashedPassword });
    console.log("User created");
    res.status(201).json({ message: "User created" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/sign-in", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid User" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Wrong password" });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.status(200).json({ message: "Signed in successfully", token });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/profile-edit", async (req, res) => {
  try {
    const {
      fullName,email,password,phoneNo,location,linkedin,designation,
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

    if (password && (await bcrypt.compare(password, user.password))) {
      await user.save();
      res.status(200).json({ message: "Profile Updated successfully" });
    } else if (password) {
      return res.status(401).json({ message: "Wrong Password" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/company",async(req,res)=>{
  try{
    const {companyName,companyWebsite,support_email}=req.body;
    const street = req.body['address[street]'];
    const city = req.body['address[city]'];
    const pincode = req.body['address[pincode]'];
    const existingCompany = await Company.findOne({ companyName });
    if (existingCompany) {
      return res.status(400).json({ message: "Company already exists" });
    }

    const file = req.files.file;
    if (!file) {
      return res.status(400).json({ error: 'File is required.' });
    }

    const fileBuffer = Buffer.from(file.data, 'binary');
    const base64Encoded = fileBuffer.toString('base64');
    
    if (fileBuffer.length > 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 1 MB. Please upload a smaller file.' });
    }

    const userId = req.user.userId;
    const companyId = uuidv4();

    const company = await Company.create({companyId,companyName,companyWebsite,address:{ street, city, pincode },logo:base64Encoded,support_email,createdBy:userId});

    console.log("Company is created", company);
    res.status(201).json({ message: "Company is created Successfully" });
  }
  catch(error){
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/company/:companyId",async(req,res)=>{
  try{
    const companyId = req.params.companyId;
    const company = await Company.findOne({companyId: companyId })
    .populate({
      path: 'createdBy',
      select: 'fullName -_id',
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.status(200).json({ company });
  }
  catch(error){
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get("/me/companies",async(req,res)=>{
  try {
    const userId = req.user.userId;
    const companies = await Company.find({ createdBy: userId });

    const companyUUIDs = companies.map(company => company.companyId);

    res.status(200).json({ companyUUIDs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get("/job-application", async (req, res) => {
  try {
    const jobApplications = await JobApplication.find();
    res.status(200).json(jobApplications);
  } catch (error) {
    console.error("Error fetching job applications:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

router.post("/job-application", async (req, res) => {
  try {
    const { fullname, email, education, exp, portfolio, github, linkedin, skills, progLang, currLoc, shiftToNew, slot } = req.body;
    const formattedEducation = education.map((edu) => ({
      eduLevel: edu.eduLevel,
      schoolName: edu.schoolName,
      passYear: edu.passYear,
      cgpa: edu.cgpa
    }));
    const formattedExp = exp.map((expItem) => {
      const fromDate = new Date(expItem.from);
      const toDate = new Date(expItem.to);
      const diffTime = Math.abs(toDate - fromDate);
      const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365);
      return {
        from: fromDate,
        to: toDate,
        jobTitle: expItem.jobTitle,
        yearsOfExp: Math.round(diffYears),
      };
    });
    const newJobApplication = await JobApplication.create({ fullname, email, education: formattedEducation, exp: formattedExp, portfolio, github, linkedin, skills, progLang, currLoc, shiftToNew, slot });
    console.log("Job Application Posted");
    res.status(201).json({ message: "Job application submitted successfully", jobApplication: newJobApplication });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/company/:id/postings", async (req, res) => {
  try {
    const companyId = req.params.id;
    const company = await Company.findById(companyId);
    if (!company) {
      console.log("No such company");
      return res.status(404).json({ message: "No such company" });
    }
    const postings = await JobPost.find({ company: companyId }).select('_id');
    const postingIds = postings.map(posting => posting._id);
    res.status(200).json({ postings: postingIds });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/company/:id/posting", checkCompanyOwnership, async (req, res) => {
  try {
    const jobPost = await JobPost.create({
      job_title: req.body.job_title, 
      location: req.body.location, 
      job_type: req.body.job_type, 
      description: req.body.description, 
      salary_range: req.body.salary_range, 
      company: req.params.id, 
      createdBy: req.user.userId });
    res.status(201).json({ message: "Job posting created successfully", jobPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/company/:id/posting/:postingid/application/:applicationID", async (req, res) => {
  try {
    const companyId = req.params.id;
    const postingId = req.params.postingid;
    const applicationId = req.params.applicationID;
    const company = await Company.findById(companyId);
    const jobPost = await JobPost.findById(postingId);
    if ( !company || !jobPost ) {
      return res.status(401).json({ message: "Forbidden: Invalid company or job post" });
    }
    if (!jobPost.company.equals(companyId)) {
      return res.status(403).json({ message: "Forbidden: Job post does not belong to the specified company" });
    }
    const jobApplication = await JobApplication.findById(applicationId);
    if (!jobApplication || !jobApplication.company.equals(companyId) || !jobApplication.jobPost.equals(postingId)) {
      return res.status(404).json({ message: "Not Found: Job application not found or does not belong to the specified company and job post" });
    }
    res.status(200).json({ message: "Job application details retrieved successfully", application: jobApplication });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/company/:id/posting/:postingid/application", async (req, res) => {
  try {
    const companyId = req.params.id;
    const postingId = req.params.postingid;
    const applicantId = req.user.userId;
    const company = await Company.findById(companyId);
    const jobPost = await JobPost.findById(postingId);
    if ( !company || !jobPost ) {
      return res.status(401).json({ message: "Forbidden: Invalid company or job post" });
    }
    if ( company.createdBy.equals(applicantId) ) {
      return res.status(402).json({ message: "Forbidden: You cannot apply to your own company." });
    }
    if ( !jobPost.company.equals(companyId) ) {
      return res.status(403).json({ message: "Forbidden: Job post does not belong to the specified company" });
    }
    const existingApplication = await JobApplication.findOne({
      jobPost: postingId,
      company: companyId,
      applicantID: applicantId
    });
    if (existingApplication) {
      return res.status(400).json({ message: "Sorry you can apply for this job only once" });
    }
    const newJobApplication = await JobApplication.create({
      applicantName: req.body.applicantName,
      applicantID: applicantId,
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
      jobPost: postingId,
      company: companyId
    });
    res.status(201).json({ message: "Job application created successfully", application: newJobApplication });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/sign-out", async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Signed out successfully" });
});

module.exports = router;