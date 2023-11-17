const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const CompanySchema = new Schema({
    _id: { type: String },
    companyName: { type: String, required: true },
    companyWebsite: { type: String, required: true },
    address:{
        street: { type: String,required: true },
        city: { type: String,required: true },
        pincode: { type: String,required: true },
    },
    logo: {type: String,  default:""},
    support_email: { type: String },
    createdBy: { type: String, required: true }
});

module.exports = mongoose.model("Company", CompanySchema);