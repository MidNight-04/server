const mongoose = require('mongoose');

const payProjectnotificationModel = mongoose.model(
    'payProjectNotification',
    new mongoose.Schema({
        clientID: {
            type: String,
            ref: "User"
        },
        message: {
            type: String,
            default: ""
        },
        read: {
            type: Boolean,
            default: false
        },
        readByClient: {
            type: Boolean,
            default: false
        },
        url: String
    }, { timestamps: true })
);

module.exports = payProjectnotificationModel;