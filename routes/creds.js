const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
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
    const { FullName, Email, Password, CompanyName } = req.body;
    const user = await User.findOne({ email: Email });
    if (!user) {
      return res.status(401).json({ message: "Invalid User" });
    }
    if (FullName) {
      user.fullname = FullName;
    }
    if (Password) {
      const hashedPassword = await bcrypt.hash(Password, 7);
      user.password = hashedPassword;
    }
    if (CompanyName) {
      user.companyName = CompanyName;
    }
    await user.save({ FullName, Email, Password, CompanyName });

    res.status(200).json({ message: "Profile Updated successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/sign-out", async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Signed out successfully" });
});

module.exports = router;
