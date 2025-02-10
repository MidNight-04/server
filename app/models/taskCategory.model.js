const mongoose = require('mongoose');

const taskCategoryModel = mongoose.model(
    'taskCategories',
    new mongoose.Schema({
        name: String
    }, { timestamps: true })
);

module.exports = taskCategoryModel