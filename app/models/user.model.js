const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    firstname: String,
    lastname: String,
    username: { type: String, required: true, unique: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // required: true,
      // minlength: 6,
    },
    employeeID: {
      type: String,
    },
    token: String,
    refreshToken: String,
    loginOtp: { type: String, default: '' },
    phone: { type: String, default: '' },
    countryCode: { type: String, default: '+91' },
    city: String,
    state: String,
    country: {
      type: String,
      default: 'India',
    },
    zipCode: String,
    profileImage: {
      type: String,
      default: '',
    },
    isExist: { type: Boolean, default: false },
    userStatus: {
      type: String,
      enum: ['active', 'inactive', 'blocked'],
      default: 'active',
    },
    roles: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
    },
    playerIds: {
      type: [String],
      default: [],
    },
    notifications: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Notification' },
    ],
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model('User', UserSchema);
