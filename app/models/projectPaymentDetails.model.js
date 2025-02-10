const mongoose = require('mongoose');

const projectPaymentDetailsModel = mongoose.model(
    'projectPaymentDetails',
    new mongoose.Schema({
        siteID:String,
        clientID:String,
        stage:String,
        amount:Number,
        paymentType: String,
        paymentInformation:{}
    }, { timestamps: true })
);

module.exports = projectPaymentDetailsModel