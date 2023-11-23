const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const JobApplicaionSchema = new Schema({
  _id: { type: String, required: true },
  applicantName: { type: String, required: true, default: "" },
  applicantID: { type: String, required: true },
  email: { type: String, required: true },
  phone: {type: String, required: false },
  education: [
    {
      degree: { type: String, required: true }, 
      institution: { type: String, required: true },
      graduationDate: {type: Date, required: true },
      cgpa: {type: Number, required: false }
    }
  ],
  workExperience: [
    {
      company: { type: String, required: false },
      position: { type: String, required: false },
      startDate: { type: Date, required: false },
      endDate: { type: Date, required: false },
      yearsOfExp: { type: Number, required: false },
      responsibilities: { type: String, required: false }  
    }
  ],
  resume: {type: String, required: false },
  coverLetter: {type: String, required: false },
  linkedinProfile: {type: String, required: false },
  githubProfile: {type: String, required: false },
  portfolio: {type: String, required: false },
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
      contact: {type: String, required: true },
    }
  ],
  customAnswers: {
    answers1: { type: String, required: false },
    answers2: { type: String, required: false },
    answers3: { type: String, required: false },
  },
  status: { type: String, required: true, enum: ["APPROVED", "PENDING", "REJECTED"], default: "PENDING" },
  jobPost: { type: String, required: true },
  company: { type: String, required: true }
});

module.exports = mongoose.model("JobApplication", JobApplicaionSchema);
