const mongoose = require('mongoose');

const paymentStagesModel = mongoose.model(
    'paymentStages',
    new mongoose.Schema({
        floor:String,
        stages:[]
    }, { timestamps: true })
);

module.exports = paymentStagesModel