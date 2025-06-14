const mongoose = require('mongoose');

const clientModel = mongoose.model(
    'clients',
    new mongoose.Schema({
        name: String,
        email: String,
        phone: String,
        address: String,
        password: String,
        token: String,
        refreshToken: String,
        loginOtp:{
            type:String,
            default:""
        },
        profileImage:[],
    }, { timestamps: true })
);

module.exports = clientModel