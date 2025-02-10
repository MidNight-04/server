const mongoose = require('mongoose');

const ProjectOrder = mongoose.model(
    'projectOrder',
    new mongoose.Schema({
        siteID:String,
        vendorId: String,
        userId: String,
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
        address: {},
    }, { timestamps: true })
);

module.exports = ProjectOrder