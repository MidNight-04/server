const db = require("../models");
const ROLES = db.ROLES;
const User = db.user;
let checkDuplicateUserNameOrEmail = (req, res, next) => {
  // for checking the duplicate username
  // User.findOne({
  //     username: req.body.username
  // }).exec((err, user) => {
  //     if (user) {
  //         return res.status(400).send({
  //             message: "Failed, username already exists, try using a different username"
  //         });
  //     }
  //     if (err) {
  //         return res.status(500).send({
  //             message: err
  //         });
  //     }
  // })

  // for checking the duplicate email
  User.findOne({
    $or: [{ email: req.body.email }, { phone: req.body.email }],
  }).exec((err, result) => {
    if (result) {
      return res.send({
        message:
          "User already exist, please try with different email/phone or go to login page!",
        status: 409,
      });
    } else if (err) {
      return res.status(500).send({
        message: err,
      });
    }
    next();
  });
};

let checkRolesExisted = (req, res, next) => {
  if (req.body.roles || req.body.role) {
    let temp = req.body.roles || req.body.role;
    for (let i = 0; i < temp.length; i++) {
      if (!ROLES.includes(temp[i])) {
        res.status(400).send({
          message: `Failed, Role ${temp[i]} does not exist!`,
        });
        return;
      }
    }
  }
  next();
};

const verifySignUp = {
  checkDuplicateUserNameOrEmail,
  checkRolesExisted,
};

module.exports = verifySignUp;
