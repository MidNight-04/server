const config = require("../config/auth.config");
const db = require("../models");
const ArchitectDetails = db.architectDetails;
const User = db.user;
const Role = db.role;

exports.uploadProduct = (req, res) => {
    let architectDetails = {
        approvalStatus: req.body.approvalStatus
    }

    ArchitectDetails.findByIdAndUpdate({_id: req.body._id}, architectDetails, {new: true}, (err, updated) => {
        if(err){
            res.status(500).send({message: "Could not update the status of application please try again after sometime", reason: err});
            return;
        }
        if(updated){
            res.status(200).send({message: "Updated Successfuly", data: updated});
        }
        return;
    })
}