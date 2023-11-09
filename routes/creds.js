const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const JobApplication = require("../models/Application");
router.use(express.json());
// router.use(express.urlencoded({ extended: true }));

router.post("/sign-up", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 7);
    const user = await User.create({ email, password: hashedPassword });
    console.log("User created", user);
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
    const token = jwt.sign({ userId: user.email }, process.env.JWT_SECRET, {
      expiresIn: "20s",
    });
    res.cookie("token", token, { httpOnly: true });
    res.status(200).json({ message: "Signed in successfully", token });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/profile-edit", async (req, res) => {
  try {
    const { fullName, email, password, companyName } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid User" });
    }
    if (fullName) {
      user.fullName = fullName;
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 7);
      user.password = hashedPassword;
    }
    if (companyName) {
      user.companyName = companyName;
    }
    await user.save();

    res.status(200).json({ message: "Profile Updated successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/job-application", async (req, res) => {
  try {
    
    const { fullname, email, education, exp, portfolio, github, linkedin, skills, progLang, currLoc, shiftToNew, slot } = req.body;
    const formattedEducation = education.map(edu => ({
      eduLevel: edu.eduLevel,
      schoolName: edu.schoolName,
      passYear: edu.passYear,
      cgpa: edu.cgpa
    }));
    const formattedExp = exp.map(expItem => {
      const fromDate = new Date(expItem.from);
      const toDate = new Date(expItem.to);

      const diffTime = Math.abs(toDate - fromDate);
      const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365);

      return {
        from: fromDate,
        to: toDate,
        jobTitle: expItem.jobTitle,
        yearsOfExp: Math.round(diffYears)
      };
    });
    const newJobApplication = await JobApplication.create({ fullname, email, education: formattedEducation, exp: formattedExp, portfolio, github, linkedin, skills, progLang, currLoc, shiftToNew, slot });
    console.log("Job Application Posted")
    res.status(201).json({ message: 'Job application submitted successfully', jobApplication: newJobApplication });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/sign-out", async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Signed out successfully" });
});

module.exports = router;