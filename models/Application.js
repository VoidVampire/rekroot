const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const JobApplicaionSchema = new Schema({
  fullname: { type: String, required: true, default: "" },
  email: { type: String, required: true, unique: true },
  education: [
    {
      eduLevel: { type: String, required: true }, 
      schoolName: { type: String, required: true },
      passYear: {type: Number, required: true },
      cgpa: {type: Number, required: true }
    }
  ],
  exp: [
    {
      from: { type: Date, required: true },
      to: { type: Date, required: true},
      jobTitle: { type: String, required: true },
      yearsOfExp: { type: Number, required: true }
    }
  ],
  portfolio: { type:String, required: true },
  github: { type:String, required: true },
  linkedin: { type:String, required: true },
  skills: [{ type:String, required: true }],
  progLang: [{ type:String, required: true }],
  currLoc: {
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true }         
  },
  shiftToNew: { type:Boolean, required: true },
  slot: { type: Date, required: true }
});

module.exports = mongoose.model("JobApplication", JobApplicaionSchema);