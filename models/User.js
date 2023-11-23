const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  _id: { type: String, required: true },
  fullName: { type: String, default: "" },
  email: { type: String, required: true, unique: true },
  phoneNo: { type: String, default: ""},
  location: { type: String, default: "" },
  linkedin: { type: String, default: "" },
  companies: [{ type: String }],
});

module.exports = mongoose.model("User", UserSchema);