const mongoose = require('mongoose');

const DealerRating = mongoose.model(
    'dealerrating',
    new mongoose.Schema({
        dealerid: String,
        title: String,
        username: String,
        rating: String,
        comments: String,
        userId: String,
        date:String
    })
);

module.exports = DealerRating