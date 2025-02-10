const config = require("../config/auth.config");
const db = require("../models");
const notificationModel = db.payProjectNotification;

exports.createNotification = (req, res) => {
  let dataUpdate = {
    clientID: req.body.clientID,
    message: req.body.message,
    url: req.body.url,
  };
  // console.log(dataUpdate)
  let notification = new notificationModel(dataUpdate);
  notification.save((err, result) => {
    if (err) {
      res
        .status(500)
        .send({ message: "Internal server error" });
      return;
    }
    else {

      res.status(200).send({ message: "Payment success notification created successfully", data: result });
    }
    return;
  }
  );
};

exports.updateNotification = (req, res) => {
  let dataUpdate = {
    clientID: req.body.clientID,
    message: req.body.message,
    url: req.body.url,
    read: req.body.read,
    readByClient:req.body.readByClient
  };

  notificationModel.updateOne({ _id: req.body.id }, {
    $set: dataUpdate
  }).then((result, err) => {
    if (err) {
      res
        .status(500)
        .send({ message: "Could not find id to update notification" });
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
