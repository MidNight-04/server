const mongoose = require('mongoose');

const LikeList = mongoose.model(
    "likeList",
    new mongoose.Schema({
        userId:   {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        designId:   {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Design"
        },

    }, { timestamps: true })
);

module.exports = LikeList;