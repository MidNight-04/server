const mongoose = require('mongoose');

const processModel = mongoose.model(
    'constructionsteps',
    new mongoose.Schema({
        name: String,
        priority:String,
        points:[],
    }, { timestamps: true })
);

module.exports = processModel