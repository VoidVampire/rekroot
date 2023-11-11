const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const JobApplicaionSchema = new Schema({
  applicantName: { type: String, required: true, default: "" },
  email: { type: String, required: true, unique: true },
  phone: {type: Number, required: true },
  education: [
    {
      degree: { type: String, required: true }, 
      institution: { type: String, required: true },
      graduationDate: {type: Number, required: true },
      cgpa: {type: Number, required: true }
    }
  ],
  workExperience: [
    {
      company: { type: String, required: true },
      position: { type: String, required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true},
      yearsOfExp: { type: Number, required: true },
      responsibilities: { type: String, required: true }
    }
  ],
  resume: {type: String, required: true },
  coverLetter: {type: String, required: true },
  linkedinProfile: {type: String, required: true },
  githubProfile: {type: String, required: true },
  portfolio: {type: String, required: true },
  skills: [{ type:String, required: true }],
  currLoc: {
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true }         
  },
  shiftToNew: { type:Boolean, required: true },
  slot: { type: Date, required: true },
  references: [
    {
      name: { type: String, required: true }, 
      relationship: { type: String, required: true },
      contact: {type: Number, required: true },
    }
  ],
  customQuestions: {
    question1: { String, required: true },
    question2: { String, required: true },
    question3: { String, required: true },
  },
  jobPost: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
});

module.exports = mongoose.model("JobApplication", JobApplicaionSchema);