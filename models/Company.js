const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const CompanySchema = new Schema({
    companyName: { type: String, required: true },
    companyWebsite: { type: String, required: true },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        pincode: { type: String, required: true },
    },
    logo: {type: String, required: true},
    support_email: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }, 
});

module.exports = mongoose.model("Company", CompanySchema);