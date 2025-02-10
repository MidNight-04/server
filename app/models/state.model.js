const mongoose = require('mongoose');

const States = mongoose.model(
    'states',
    new mongoose.Schema({
        id: String,
        name: String,
        state_code: String,
        country_id: String,
        country_code: String,
        country_name: String,
        latitude: String,
        longitude: String
    })
);

module.exports = States