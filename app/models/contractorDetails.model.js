const mongoose = require('mongoose');

const ContractorDetails = mongoose.model(
    'ContractorDetails',
    new mongoose.Schema({
        id: String,
        name: String,
        photo: String,
        designation: String,
        companyNameShopName: String,
        address: String,
        gst: String,
        pan: String,
        bankDetails: String,
        upiDetails: String,
        aadharNumber: String,
        dateOfCompanyFormation: String,
        businessContactNumber: String,
        serviceLocationState: String,
        serviceLocationCity: String,
        radiusOfDelivery: String,
        merchantType: String,
        approvalStatus: {
            type: String,
            default: "Pending"
        },
        gstImage: [],
        panImage: [],
        bankDetailsImage: [],
        aadharImage: [],
        userStatus: {
            type: String,
            default: "active"
        },
    }, { timestamps: true })
);

module.exports = ContractorDetails