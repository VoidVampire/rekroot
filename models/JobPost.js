const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const JobPostSchema = new Schema({
    _id: { type: String },
    job_title: { type: String, required: true },
    created_at: { type: Date, required: true, default: Date.now },
    location: {
        state: { type: String, required: true },
        country: { type: String, required: true },
    },
    job_type: { type: String, required: true, enum: ["REMOTE", "ONSITE", "HYBRID"], default: "REMOTE" },
    description: { type: String, required: true },
    salary_range: { type: String, required: true },
    company: { type: String, required: true },
    createdBy: { type: String, required: true },
});

module.exports = mongoose.model("JobPost", JobPostSchema);
