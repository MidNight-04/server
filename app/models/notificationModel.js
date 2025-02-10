const mongoose = require('mongoose');

const notificationModel = mongoose.model(
    'notificationModel',
    new mongoose.Schema({
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        receiverId: {
            type: String,
        },
        message: {
            type: String,
            default: ""
        },
        userType: {
            type: String,
            default: ""
        },
        read: {
            type: Boolean,
            default: false
        },
        url: String
    }, { timestamps: true })
);

module.exports = notificationModel