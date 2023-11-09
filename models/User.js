const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const UserSchema = new Schema({
  fullname: { type: String, default: "" },
  email: { type: String, maxlength: 30, required: true, unique: true },
  password: { type: String, required: true },
  companyName: { type: String, default: "" },
});

module.exports = mongoose.model("User", UserSchema);
