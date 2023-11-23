const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const JobApplicaionSchema = new Schema({
  _id: { type: String, required: true },
  applicantName: { type: String, required: true, default: "" },
  applicantID: { type: String, required: true },
  email: { type: String, required: true },
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
  customAnswers: {
    answers1: { type: String, required: true },
    answers2: { type: String, required: true },
    answers3: { type: String, required: true },
  },
  status: { type: String, required: true, enum: ["APPROVED", "PENDING", "REJECTED", "CLOSED"], default: "PENDING" },
  jobPost: { type: String, required: true },
  company: { type: String, required: true }
});

module.exports = mongoose.model("JobApplication", JobApplicaionSchema);