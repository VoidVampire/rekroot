const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const JobPostSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model("JobPost", JobPostSchema);
