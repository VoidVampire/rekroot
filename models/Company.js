const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const CompanySchema = new Schema({
    companyId:{ type:String, required:true },
    companyName: { type: String, required: true },
    companyWebsite: { type: String, required: true },
    address: {
        street: { type: String },
        city: { type: String },
        pincode: { type: String },
    },
    logo: {type: String, required: true},
    support_email: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }, 
});

module.exports = mongoose.model("Company", CompanySchema);