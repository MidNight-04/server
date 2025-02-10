const mongoose = require('mongoose');

const projectPaymentStagesModel = mongoose.model(
    'projectPaymentStages',
    new mongoose.Schema({
        siteID:String,
        clientID:String,
        floor:String,
        stages:[]
    }, { timestamps: true })
);

module.exports = projectPaymentStagesModel