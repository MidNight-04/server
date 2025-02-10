const mongoose = require('mongoose');

const projectAddressModel = mongoose.model(
    'projectAddressModel',
    new mongoose.Schema({
        siteID:String,
        address: String,
        city: String,
        state: String,
        zipCode: String,
        nearBy: String,
        country: String,
        phone: String
    }, { timestamps: true })
);

module.exports = projectAddressModel