const { Schema, model } = require('mongoose');

const signUpSchema = new Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please enter a valid phone number'],
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    userType: {
      type: String,
      enum: ['individual', 'contractor', 'architect', 'builder', 'engineer'],
      required: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please enter a valid email address',
      ],
    },
  },
  { timestamps: true }
);

module.exports = model('signUp', signUpSchema);
