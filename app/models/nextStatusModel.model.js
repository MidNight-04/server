const mongoose = require('mongoose');

const nextStatusModel = mongoose.model(
    'nextStatusModel',
    new mongoose.Schema({
        name: String,
        label: String,
        type: String
    }, { timestamps: true })
);

module.exports = nextStatusModel