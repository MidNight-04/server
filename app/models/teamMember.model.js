const { type } = require('@testing-library/user-event/dist/type');
const mongoose = require('mongoose');

const memberModel = mongoose.model(
    'teammembers',
    new mongoose.Schema({
        name: String,
        employeeID:String,
        role: String,
        email:String,
        phone: String,
        address: String,
        loginOtp:{
            type:String,
            default:""
        },
        profileImage:[],
    }, { timestamps: true })
);

module.exports = memberModel