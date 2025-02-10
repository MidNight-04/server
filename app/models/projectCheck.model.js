const mongoose = require('mongoose');

const projectCheckListModel = mongoose.model(
    'projectcheckList',
    new mongoose.Schema({
        checkListStep:String,
        name:String,
        checkListNumber:Number,
        checkList:[]
    }, { timestamps: true })
);

module.exports = projectCheckListModel