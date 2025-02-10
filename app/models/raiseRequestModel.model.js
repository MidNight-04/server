const mongoose = require('mongoose');

const raiseRequestModel = mongoose.model(
    'raiseRequestModel',
    new mongoose.Schema({
        userId: {
            type: mongoose.Schema.Types.ObjectId
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId
        },
        approvalStatus: {
            type: String,
            default: "Pending"
        },
        requestRaised: {
            type: Boolean,
            default: false
        },
        comment: String
    }, { timestamps: true })
);

module.exports = raiseRequestModel