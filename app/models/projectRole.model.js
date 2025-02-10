const mongoose = require('mongoose');

const projectRoleModel = mongoose.model(
    'projectroles',
    new mongoose.Schema({
        name: String
    }, { timestamps: true })
);

module.exports = projectRoleModel