const mongoose = require('mongoose');

const logModel = mongoose.model(
    'projectlogs',
    new mongoose.Schema({
        log: String,
        file:[],
        date:String,
        siteID:String,
        member:{
            name:String,
            Id:String
        },
    }, { timestamps: true })
);

module.exports = logModel