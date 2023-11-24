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

const AuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization && req.headers.authorization.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null;
    if (!token) {
      return res.status(401).json({ message: "No Token provided" });
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data) {
      throw error || new Error('Unauthorized');
    }
    req.userId = data.user.id;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized', error: error.message });
  }
};

const checkCompanyOwnership = async (req, res, next) => {
  try {
    const companyID = req.params.companyID;
    const company = await Company.findById(companyID);
    if (!company || company.createdBy !== req.userId) {
      console.log("Access Denied");
      return res.status(403).json({ message: "Forbidden: You are not the owner of this company" });
    }
    console.log("Access Granted");
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message});
  }
};

router.post('/sign-up', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email }, 'email');
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
    res.status(500).json({ message: 'Sign-up failed', error: error.message });
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
    res.status(500).json({ message: 'Sign-in failed', error: error.message });
  }
});

router.post('/sign-up-github', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'github' });
    console.log(data);
    res.status(200).json({ message: 'Sign-in successful', token: data.session.access_token });
  } catch (error) {
    res.status(500).json({ message: 'Sign-in failed', error: error.message });
  }
});

router.post('/sign-out', AuthMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) { throw error; }
    res.status(200).json({ message: 'Sign-out successful' });
  } catch (error) {
    res.status(400).json({ message: 'Sign-out failed', error: error.message });
  }
});

router.post('/delete-my-account', AuthMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
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
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/me/companies", AuthMiddleware, async (req, res) => {
  try {
    const userID = req.userId;
    const companyUUIDs = await Company.distinct('_id', { createdBy: userID });
    res.status(200).json({ companyUUIDs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error', error: error.message});
  }
});

router.get("/me/applications", AuthMiddleware, async (req, res) => {
  try {
    const userID = req.userId;
    const applicationIds = await JobApplication.find({ applicantID: userID })
    .populate({
      path: 'jobPost',
      select: 'job_title',
      model: JobPost,
    })
    .populate({
      path: 'company',
      select: 'companyName',
      model: Company,
    });
    res.status(200).json({ applications: applicationIds });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
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
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/company", AuthMiddleware, async (req, res) => {
  const companies = await Company.find();
  res.status(200).json(companies);
})

router.get('/all-jobposts', async (req, res) => {
  try {
    const jobPosts = await JobPost.find({}, 'job_title created_at job_type company createdBy')
      .populate({
        path: 'createdBy',
        select: 'fullName',
        model: User,
      })
      .populate({
        path: 'company',
        select: 'companyName',
        model: Company,
      });
    res.status(200).json({ jobPosts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/company", AuthMiddleware, async (req, res) => {
  try {
    const { companyName, companyWebsite, address, support_email } = req.body;
    const existingCompany = await Company.findOne({ companyName });
    if (existingCompany) {
      return res.status(400).json({ message: "Company already exists" });
    }
    const userID = req.userId;
    const companyID = uuidv4();
    const company = await Company.create({ _id: companyID, companyName, companyWebsite, address, support_email, createdBy: userID });
    console.log("Company is created", company);
    res.status(201).json({ message: "Company is created Successfully" });
  }
  catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error", error: error.message });
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
    res.status(500).json({ message: "Server Error", error: error.message });
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
    res.status(500).json({ message: "Server Error", error: error.message });
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
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.patch('/company/:companyID', AuthMiddleware, checkCompanyOwnership, async (req, res) => {
  try {
    const companyId = req.params.companyID;
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    const { companyName, companyWebsite, address, logo, support_email } = req.body;
    if (companyName) {
      company.companyName = companyName;
    }
    if (companyWebsite) {
      company.companyWebsite = companyWebsite;
    }
    if (address) {
      if (address.street) {
        company.address.street = address.street;
      }
      if (address.city) {
        company.address.city = address.city;
      }
      if (address.pincode) {
        company.address.pincode = address.pincode;
      }
    }
    if (logo) {
      company.logo = logo;
    }
    if (support_email) {
      company.support_email = support_email;
    }
    const updatedCompany = await company.save();
    res.status(200).json(updatedCompany);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/company/:companyID', AuthMiddleware, checkCompanyOwnership, async (req, res) => {
  try {
    const companyID = req.params.companyID;
    const companyExists = await Company.exists({ _id: companyID });
    if (!companyExists) {
      return res.status(404).json({ message: 'Company not found' });
    }
    await JobApplication.deleteMany({ company: companyID });
    await JobPost.deleteMany({ company: companyID });
    await Company.findByIdAndDelete(companyID);
    return res.status(200).json({ message: 'Company deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

router.get('/posting', AuthMiddleware, async (req, res) => {
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
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

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
    res.status(500).json({ message: "Server Error", error: error.message });
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
      customQuestions: req.body.customQuestions,
      company: req.params.companyID,
      createdBy: req.userId
    });
    res.status(201).json({ message: "Job posting created successfully", jobPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
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
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.patch('/company/:companyID/posting/:postingID', AuthMiddleware, checkCompanyOwnership, async (req, res) => {
  const companyId = req.params.companyID;
  const postingId = req.params.postingID;
  try {
    const jobPost = await JobPost.findOne({ _id: postingId, company: companyId });
    if (!jobPost) {
      return res.status(404).json({ message: 'Job posting not found' });
    }
    const { job_title, location, job_type, description, salary_range } = req.body;
    if (job_title) {
      jobPost.job_title = job_title;
    }
    if (location) {
      if (location.state) {
        jobPost.location.state = location.state;
      }
      if (location.country) {
        jobPost.location.country = location.country;
      }
    }
    if (job_type) {
      jobPost.job_type = job_type;
    }
    if (description) {
      jobPost.description = description;
    }
    if (salary_range) {
      jobPost.salary_range = salary_range;
    }
    const updatedJobPost = await jobPost.save();
    res.json(updatedJobPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/company/:companyID/posting/:postingID', AuthMiddleware, checkCompanyOwnership, async (req, res) => {
  try {
    const { companyID, postingID } = req.params;
    const postingExists = await JobPost.exists({ _id: postingID });
    if (!postingExists) {
      return res.status(404).json({ message: 'Job Posting not found' });
    }
    await JobApplication.deleteMany({ jobPost: postingID });
    await JobPost.findOneAndDelete({ _id: postingID, company: companyID });
    return res.status(200).json({ message: 'Posting deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

router.get("/company/:companyID/posting/:postingID/application/:applicationID", AuthMiddleware, async (req, res) => {
  try {
    const companyID = req.params.companyID;
    const postingID = req.params.postingID;
    const applicationID = req.params.applicationID;
    const userID = req.userId;
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
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.post("/company/:companyID/posting/:postingID/application", AuthMiddleware, async (req, res) => {
  try {
    const companyID = req.params.companyID;
    const postingID = req.params.postingID;
    const applicantID = req.userId;
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
      customAnswers: req.body.customAnswers,
      jobPost: postingID,
      company: companyID
    });
    res.status(201).json({ message: "Job application created successfully", application: newJobApplication });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
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
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.post("/company/:companyID/posting/:postingID/application/:applicationID/status/:status", AuthMiddleware, checkCompanyOwnership, async (req, res) => {
  try {
    const companyID = req.params.companyID;
    const postingID = req.params.postingID;
    const applicationID = req.params.applicationID;
    const newStatus = req.params.status;
    const company = await Company.findById(companyID);
    const jobPost = await JobPost.findById(postingID);
    const jobApplication = await JobApplication.findById(applicationID);

    if (!company || !jobPost || !jobApplication) {
      return res.status(401).json({ message: "Forbidden: Invalid company, job post, or application" });
    }
    if (!(jobPost.company === companyID) || !(jobApplication.jobPost === postingID)) {
      return res.status(403).json({ message: "Forbidden: Job post or application does not belong to the specified company" });
    }
    jobApplication.status = newStatus;
    await jobApplication.save();
    res.status(201).json({ message: "Application updated."});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = router;
