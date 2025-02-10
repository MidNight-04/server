const mongoose = require('mongoose');

const EnquiryForm = mongoose.model(
    'EnquiryForm',
    new mongoose.Schema({
        architectId: {
            type: mongoose.Schema.Types.ObjectId
        },
        designId: {
            type: mongoose.Schema.Types.ObjectId
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId
        },
        addressId: {
            type: mongoose.Schema.Types.ObjectId
        },
        approvalStatus: {
            type: String,
            default: "Pending"
        },
        contactType: String,
        comment: String,
        paymentType: String,
        paymentInformation: {},
        productDetail: {}
    }, { timestamps: true })
);

module.exports = EnquiryForm