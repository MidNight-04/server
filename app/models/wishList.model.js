const mongoose = require('mongoose');

const wishList = mongoose.model(
    "wishList",
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

module.exports = wishList;