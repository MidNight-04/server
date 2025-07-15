const { type } = require('@testing-library/user-event/dist/type');
const mongoose = require('mongoose');

const projectDocumentModel = mongoose.model(
    'projectDocument',
    new mongoose.Schema({
        name:String,
        siteID:String,
        clientID:String,
        uploadingUser:String,
        status:{
            type:String,
            default:"Pending"
        },
        document:[],
    }, { timestamps: true })
);

module.exports = projectDocumentModel