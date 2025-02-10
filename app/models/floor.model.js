const mongoose = require('mongoose');

const floorModel = mongoose.model(
    'floors',
    new mongoose.Schema({
        name: String
    }, { timestamps: true })
);

module.exports = floorModel