const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const JobPostSchema = new Schema({
    job_title: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    location: {
        state: { type: String, required: true },
        country: { type: String, required: true },
    },
    job_type: { type: String, enum: ["REMOTE", "ONSITE", "HYBRID"], default: "REMOTE" },
    description: { type: String, required: true },
    salary_range: { type: String, required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

module.exports = mongoose.model("JobPost", JobPostSchema);
