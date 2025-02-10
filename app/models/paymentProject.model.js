const mongoose = require('mongoose');

const paymentProject = mongoose.model(
    'projectPay',
    new mongoose.Schema({
        siteID: String,
        clientID: String,
        payStage: String,
        paymentAmount:Number,
        contactType: String,
        paymentType: String,
        paymentInformation: {},
        projectDetails: {},
    }, { timestamps: true })
);

module.exports = paymentProject