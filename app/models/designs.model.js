const mongoose = require('mongoose');

const Design = mongoose.model(
    'Design',
    new mongoose.Schema({
        uploadingUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Role"
        },
        uploadingUserName: String,
        suitableLocation: String,
        serviceLocationState: String,
        serviceLocationCity: String,
        title: String,
        plotLength: String,
        plotWidth: String,
        numberOfBedrooms: String,
        numberOfToilets: String,
        numberOfFloor: String,
        buildingType: String,
        isVastu: String,
        isStiltdParking: String,
        purpose: String,
        specialFeature: String,
        description: String,
        approvalStatus: String,
        cadImagePrice: String,
        isSponsered: {
            type: Boolean,
            default: false
        },
        isTop: {
            type: Boolean,
            default: false
        },
        twoDImage: [],
        threeDImage: [],
        cadImage: [],
        likeUser:[{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
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

module.exports = Design