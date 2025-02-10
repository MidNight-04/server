const mongoose = require('mongoose');

const Cities = mongoose.model(
    'cities',
    new mongoose.Schema({
        id: String,
        name: String,
        state_id: String,
        state_code: String,
        state_name: String,
        country_id: String,
        country_code: String,
        country_name: String,
        latitude: String,
        longitude: String,
        wikiDataId: String,
    })
);

module.exports = Cities