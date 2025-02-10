const mongoose = require('mongoose');

const Order = mongoose.model(
    'Order',
    new mongoose.Schema({
        architectId: {
            type: String,
        },
        designId: {
            type: String,
        },
        userId: {
            type: String,
        },
        addressId: {
            type: String,
        },
        approvalStatus: {
            type: String,
            default: "Pending"
        },
        contactType: String,
        comment: String,
        paymentType: String,
        otp: String,
        invoiceImage: [],
        paymentInformation: {},
        CodPaymentStatus: String,
        productDetail: {},
    }, { timestamps: true })
);

module.exports = Order