const mongoose = require('mongoose');

const User = mongoose.model(
    'User',
    new mongoose.Schema({
        name: {
            type: String,
            default: ''
        },
        username: String,
        firstname: String,
        lastname: String,
        email: {
            type: String,
            lowercase: true
        },
        // password: String,
        token: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
        isExist: {
            type: Boolean,
            default: false
        },
        phone: {
            type: String,
            default: ''
        },
        countryCode: {
            type: String,
            default: "+91"
        },
        refreshToken: String,
        loginOtp: {
            type: String,
            default: ''
        },
        profileImage: [],
        roles: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Role"
            }
        ],
        userStatus: {
            type: String,
            default: "active"
        },
    }, { timestamps: true })
);

module.exports = User