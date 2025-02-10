const mongoose = require('mongoose');

const addressModel = mongoose.model(
    'addressModel',
    new mongoose.Schema({
        uploadingUser: {
            type: mongoose.Schema.Types.ObjectId
        },
        address: String,
        city: String,
        state: String,
        zipCode: String,
        nearBy: String,
        country: String,
        phoneNumber: String
    }, { timestamps: true })
);

module.exports = addressModel