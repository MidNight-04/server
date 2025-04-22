const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    employeeID: { type: String, unique: true, required: true },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'projectroles',
      required: true,
    },
    token: {
      type: String,
      default: '',
    },
    email: { type: String, unique: true, required: true },
    phone: { type: String },
    address: { type: String },
    loginOtp: { type: String, default: '' },
    profileImage: { type: String },
  },
  { timestamps: true }
);

const memberModel = mongoose.model('teammembers', memberSchema);

module.exports = memberModel;
