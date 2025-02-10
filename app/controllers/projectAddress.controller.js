const config = require("../config/auth.config");
const db = require("../models");
const Address = db.projectAddressModel;
const axios = require("axios");


// address api
exports.addAddress = (req, res) => {
    // console.log("request", req.body);
    let query = {
      siteID: req.body.uploadData.siteID,
      address: req.body.uploadData.address,
      city: req.body.uploadData.city,
      state: req.body.uploadData.state,
      zipCode: req.body.uploadData.zipcode,
      nearBy: req.body.uploadData.nearBy,
      country: req.body.uploadData.country,
      phone: req.body.uploadData.phone,
    };
  
    const saveAddress = new Address(query);
  
    saveAddress.save((err, address) => {
      if (err) {
        console.log("err", err);
        res.status(500).send({ message: err });
        return;
      } else {
        res
          .status(200)
          .send({ message: "address saved successfully", data: address });
      }
      return;
    });
  };
  
  exports.updateAddress = (req, res) => {
    const {
      _id,
      uploadingUser,
      address,
      city,
      state,
      zipCode,
      nearBy,
      country,
      phoneNumber,
    } = req.body;
  
    Address.updateOne(
      { _id },
      {
        $set: {
          uploadingUser,
          address,
          city,
          state,
          zipCode,
          nearBy,
          country,
          phoneNumber,
        },
      }
    ).then((address, err) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      } else {
        res
          .status(200)
          .send({ message: "address updated successfully", data: address });
      }
      return;
    });
  };
  
  exports.deleteAddress = (req, res) => {
    const { _id } = req.body;
  
    Address.deleteOne({ _id }).then((address, err) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      } else {
        res
          .status(200)
          .send({ message: "address deleted successfully", data: address });
      }
      return;
    });
  };
  
  exports.getAddress = (req, res) => {
    const { id, siteID } = req.body;
  
    if (id) {
      Address.findOne({ _id: id }).then((address, err) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        } else {
          res.status(200).send({ data: address });
        }
        return;
      });
    } else if (siteID) {
      Address.find({ siteID: siteID }).then((address, err) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        } else {
          res.status(200).send({ data: address });
        }
        return;
      });
    } else {
      Address.find({}).then((address, err) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        } else {
          res.status(200).send({ data: address });
        }
        return;
      });
    }
  };