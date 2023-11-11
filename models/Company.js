const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const CompanySchema = new Schema({
    companyName: { type: String, required: true },
    companyWebsite: { type: String, required: true },
    address: {
        street: { String, required: true },
        city: { String, required: true },
        pincode: { String, required: true },
    },
    logo: {type: String, required: true},
    support_email: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }, 
});

module.exports = mongoose.model("Company", CompanySchema);