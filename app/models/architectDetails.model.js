const mongoose = require('mongoose');

const ArchitectDetails = mongoose.model(
    'ArchitectDetails',
    new mongoose.Schema({
        id: String,
        name: String,
        photo: String,
        designation: String,
        companyName: String,
        address: String,
        gst: String,
        pan: String,
        paymentMethod: String,
        bankDetails: String,
        coaLicenseNumber: String,
        otherLicense: String,
        qualification: String,
        servicesOffered: String,
        qualificationDocument: String,
        aadharNumber: String,
        dateOfBirth: String,
        businessContactNumber: String,
        serviceLocationState: String,
        serviceLocationCity: String,
        yearsOfExperience: String,
        yearOfGraduation: String,
        comment: String,
        approvalStatus: {
            type: String,
            default: "Pending"
        },
        gstImage: [],
        bankDetailsImage: [],
        panImage: [],
        coaLicenseImage: [],
        otherLicenseImage: [],
        aadharImage: [],
        userStatus: {
            type: String,
            default: "active"
        },
        authorized: {
            type: String,
            default: "false"
        },
    }, { timestamps: true })
);

module.exports = ArchitectDetails