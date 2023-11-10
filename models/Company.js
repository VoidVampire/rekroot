const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const CompanySchema = new Schema({
    companyName: { type: String, default: "" },
    companyWebsite: { type: String, default: "" },
    address: {
        street: String,
        city: String,
        pincode: String,
    },
    logo: String,
    support_email: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Make createdBy a reference to the User model
});

module.exports = mongoose.model("Company", CompanySchema);
