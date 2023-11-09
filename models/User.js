const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const UserSchema = new Schema({
  fullName: { type: String, default: "" },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNo: { type: Number, default: 0 },
  location: { type: String, default: "" },
  linkedin: { type: String, default: "" },
  designation: { type: String, default: "" },
  companyName: { type: String, default: "" },
  companyWebsite: { type: String, default: "" },
});

module.exports = mongoose.model("User", UserSchema);
