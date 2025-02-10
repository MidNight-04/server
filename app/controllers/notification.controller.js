const config = require("../config/auth.config");
const db = require("../models");
const CategoryDetails = db.categoryDetails;
const notificationModel = db.notification;

exports.createNotification = (req, res) => {
  let dataUpdate = {
    senderId: "64b12b02c1d7d80ce3fd3990",
    receiverId: req.body.receiverId,
    message: req.body.message,
    url: req.body.url,
    userType:req.body.userType?req.body.userType:""
  };
  let notification = new notificationModel(dataUpdate);
  notification.save((err, result) => {
    if (err) {
      res
        .status(500)
        .send({ message: "Could not find id to update category" });
      return;
    }
    else {

      res.status(200).send({ message: "Updated Successfuly", data: result });
    }
    return;
  }
  );
};

exports.updateNotification = (req, res) => {
  let dataUpdate = {
    senderId: "64b12b02c1d7d80ce3fd3990",
    receiverId: req.body.receiverId,
    message: req.body.message,
    url: req.body.url,
    read: true
  };

  notificationModel.updateOne({ _id: req.body.id }, {
    $set: dataUpdate
  }).then((result, err) => {
    if (err) {
      res
        .status(500)
        .send({ message: "Could not find id to update category" });
      return;
    }
    else {

      res.status(200).send({ message: "Notifcation Updated Successfuly", data: result });
    }
    return;
  }
  );
};

exports.getAllNotification = (req, res) => {

  let query = {
    receiverId: req.body.id
  }
  if (req.body.id) {
    notificationModel.find(query)
      .then((notification, err) => {
        if (err) {
          res
            .status(500)
            .send({
              message: "There was a problem in getting the list of notification",
            });
          return;
        }
        if (notification) {
          res.status(200).send({
            message: "List of fetched successfuly",
            data: notification,
          });
        }
      })
  } else {
    notificationModel.find({})
      .then((notification, err) => {
        if (err) {
          res
            .status(500)
            .send({
              message: "There was a problem in getting the list of notification",
            });
          return;
        }
        if (notification) {
          res.status(200).send({
            message: "List of fetched successfuly",
            data: notification,
          });
        }
      })
  }
  return;
};
