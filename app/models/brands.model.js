const mongoose = require('mongoose');

const Brands = mongoose.model(
    'Brands',
    new mongoose.Schema({
        name: String,
        productImage: [],
        unit:String,
        price: String,
        maxQuantity: String,
        minQuantity: String,
        descriptionOne: String,
        descriptionTwo: String,
        descriptionThree: String,
        approvalStatus: {
            type: String,
            default: "Pending"
        },
        productCommission: {
            type: String,
            default: ""
        },
        isSponsered: {
            type: Boolean,
            default: false
        },
        isTop: {
            type: Boolean,
            default: false
        },
        uploadingUser: String,
        uploadingUserName: String,
        suitableLocation: String,
        serviceLocationState: String,
        serviceLocationCity: String,
        // category: [],
        category: String,
        comment: String,
        wishUser:[{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        userStatus: {
            type: String,
            default: "active"
        },
    }, { timestamps: true })
);

module.exports = Brands