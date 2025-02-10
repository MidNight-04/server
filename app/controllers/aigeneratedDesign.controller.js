const config = require("../config/auth.config");
const db = require("../models");
const AiGeneratedDesign = db.aiGeneratedDesign;
const User = db.user;
const Role = db.role;

exports.saveAigeneratedDesign = (req, res) => {
    let aigenerateddesign = new AiGeneratedDesign({
        city: req?.body?.city || null,
        numberofFloors: req?.body?.numberofFloors || null,
        plotLength: req?.body?.plotLength || null,
        plotWidth: req?.body?.plotWidth || null,
        requireBasement: req?.body?.requireBasement || null,
        requierStilt: req?.body?.requierStilt || null,
        ipAddress: req?.body?.ipAddress || null,
    })

    aigenerateddesign.save((err, aiGeneratedSaved) => {
        if (err) {
            res.status(500).send({ message: 'There was problelm while searching your plot' });
            return;
        }
        res.status(200).send({ message: 'Your plot have been listed in few mintues!', data: aiGeneratedSaved });
    })
}


exports.getAIGeneratedDesign = (req, res) => {
    AiGeneratedDesign.find({}, (err, dealer) => {
        if (err) {
            res.status(500).send({ message: "The requested data could not be fetched" })
            return;
        }
        res.status(200).send({
            message: "Details feched successfully",
            data: dealer
        })
        return;
    })
}