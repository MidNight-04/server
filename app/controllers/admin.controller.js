const config = require("../config/auth.config");
const db = require("../models");
const Design = require("../models/designs.model");
const ArchitectDetails = db.architectDetails;
const DealerDetails = db.dealerDetails;
const ContractorDetails = db.contractorDetails;
const Brands = db.brands;
const User = db.user;
const Role = db.role;

exports.approveApplicationArchitect = (req, res) => {
  let architectDetails = {
    approvalStatus: req.body.approvalStatus,
    comment: req.body.comment,
  };
  ArchitectDetails.findOneAndUpdate(
    { id: req.body._id },
    {
      $set: {
        approvalStatus: architectDetails.approvalStatus,
        comment: architectDetails.comment,
      },
    },
    { returnOriginal: false },
    (err, updated) => {
      if (err) {
        res.status(500).send({
          message:
            "Could not update the status of application please try again after sometime",
          reason: err,
        });
        return;
      }
      if (updated) {
        res
          .status(200)
          .send({ message: "Updated Successfully", data: updated });
      } else {
        res.status(404).send({ message: "Architect details not found" });
      }
    }
  );
};

exports.approveDesignArchitect = (req, res) => {
  let designDetails = {
    approvalStatus: req.body.approvalStatus,
    comment: req.body.comment,
  };

  Design.findByIdAndUpdate(
    { _id: req.body._id },
    designDetails,
    { new: true },
    (err, updated) => {
      if (err) {
        res.status(500).send({
          message:
            "Could not update the status of application please try again after sometime",
          reason: err,
        });
        return;
      }
      if (updated) {
        res.status(200).send({ message: "Updated Successfuly", data: updated });
      }
      return;
    }
  );
};

exports.approveApplicationDealer = (req, res) => {
  let dealerDeatails = {
    approvalStatus: req.body.approvalStatus,
    comment:req.body.comment
  };
  // console.log(dealerDeatails);
  DealerDetails.findOneAndUpdate(
    { id: req.body._id },
    {
      $set: {
        approvalStatus: dealerDeatails.approvalStatus,
        comment: dealerDeatails.comment,
      },
    },
    { returnOriginal: false },
    (err, updated) => {
      if (err) {
        res.status(500).send({
          message:
            "Could not update the status of application please try again after sometime",
          reason: err,
        });
        return;
      }
      if (updated) {
        res
          .status(200)
          .send({ message: "Updated Successfully", data: updated });
      } else {
        res.status(404).send({ message: "Architect details not found" });
      }
    }
  );
};
exports.approveApplicationContractor = (req, res) => {
  let dealerDeatails = {
    approvalStatus: req.body.approvalStatus,
  };
  ContractorDetails.findOneAndUpdate(
    { id: req.body._id },
    {
      $set: {
        approvalStatus: dealerDeatails.approvalStatus,
        comment: dealerDeatails.comment,
      },
    },
    { returnOriginal: false },
    (err, updated) => {
      if (err) {
        res.status(500).send({
          message:
            "Could not update the status of application please try again after sometime",
          reason: err,
        });
        return;
      }
      if (updated) {
        res
          .status(200)
          .send({ message: "Updated Successfully", data: updated });
      } else {
        res.status(404).send({ message: "Architect details not found" });
      }
    }
  );
};

exports.approveProduct = (req, res) => {
  let brandDeatails = {
    approvalStatus: req.body.approvalStatus,
    comment: req.body.comment,
  };

  Brands.findByIdAndUpdate(
    { _id: req.body._id },
    brandDeatails,
    { new: true },
    (err, updated) => {
      if (err) {
        res.status(500).send({
          message:
            "Could not update the status of product please try again after sometime",
          reason: err,
        });
        return;
      }
      if (updated) {
        res.status(200).send({ message: "Updated Successfuly", data: updated });
      }
      return;
    }
  );
};
exports.changeArchitechDealerStatus = (req, res) => {
  let { status, _id, reason } = req.body;
  if (!status && !_id) {
    return res
      .status(400)
      .send({ message: "parameter is mission please send _id and status" });
  }
  let update = {
    $set: { status, reason },
  };
  let query = { _id };

  User.findByIdAndUpdate(query, update, { new: true }, (err, updated) => {
    if (err) {
      res.status(500).send({
        message:
          "Could not update the status of application please try again after sometime",
        reason: err,
      });
      return;
    } else {
      res.status(200).send({ message: "Updated Successfuly", data: updated });
    }
    return;
  });
};
