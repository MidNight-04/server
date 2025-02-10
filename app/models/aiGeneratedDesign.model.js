const mongoose = require('mongoose');

const AiGeneratedDesign = mongoose.model(
    'AiGeneratedDesign',
    new mongoose.Schema({
        id: Number,
        city: String,
        numberofFloors: Number,
        plotLength: Number,
        plotWidth: Number,
        requireBasement: String,
        requierStilt: String,
        ipAddress: String,
    }, { timestamps: true })
);

module.exports = AiGeneratedDesign