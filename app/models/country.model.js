const mongoose = require('mongoose');

const Countries = mongoose.model(
    'countries',
    new mongoose.Schema({
        id: String,
        name: String,
        iso3: String,
        iso2: String,
        numeric_code: Number,
        phone_code: Number,
        capital: String,
        currency: String,
        currency_name: String,
        currency_symbol: String,
        tld: String,
        native: String,
        region: String,
        subregion: String,
        nationality: String,
        timezones: [],
        emoji: String,
        emojiU: String,
        latitude: String,
        longitude: String
    })
);

module.exports = Countries