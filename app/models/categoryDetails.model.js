const mongoose = require('mongoose');

const CategoryDetails = mongoose.model(
    'CategoryDetails',
    new mongoose.Schema({
        name: String,
        unit: String,
        active: Boolean,
        position: Number,
        isDeleted: Boolean,
        categoryImage: []
    }, { timestamps: true })
);

module.exports = CategoryDetails