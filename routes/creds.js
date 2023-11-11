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
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "10m" });
    res.status(200).json({ message: "Signed in successfully", token });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/profile-edit", async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      phoneNo,
      location,
      linkedin,
      designation,
      companyName,
      companyWebsite
    } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid User" });
    }
    if (fullName) {
      user.fullName = fullName;
    }
    if (phoneNo) {
      user.phoneNo = phoneNo;
    }
    if (location) {
      user.location = location;
    }
    if (linkedin) {
      user.linkedin = linkedin;
    }
    if (designation) {
      user.designation = designation;
    }
    if (companyName) {
      user.companyName = companyName;
    }
    if (companyWebsite) {
      user.companyWebsite = companyWebsite;
    }
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
    const { job_title, created_at, location, job_type, description, salary_range } = req.body;
    const jobPost = await JobPost.create({job_title, created_at, location, job_type, description, salary_range, company: req.params.id, createdBy: req.user.userId });
    res.status(201).json({ message: "Job posting created successfully", jobPost });
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