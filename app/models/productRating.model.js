const mongoose = require('mongoose');

const ProductRating = mongoose.model(
    'productrating',
    new mongoose.Schema({
        productid: String,
        title: String,
        username: String,
        rating: String,
        comments: String,
        userId: String,
        date:String
    })
);

module.exports = ProductRating