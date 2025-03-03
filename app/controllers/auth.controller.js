const config = require("../config/auth.config");
const db = require("../models");
const helperFunction = require("../middlewares/helper");
const User = db.user;
const Role = db.role;
const Country = db.countries;
const State = db.states;
const City = db.cities;
const Designs = db.designs;
const profileData = require("../helper/profileData.json");
const mongoose = require("mongoose");
const PaytmChecksum = require("../helper/PaytmChecksum");
const EnquiryForm = db.enquiryForm;
const Address = db.address;
const RaiseRequest = db.raiserequest;
const NextStatus = db.nextStatus;
const ProductRating = db.productRating;
const Order = db.order;
const axios = require("axios");
const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");

var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const Brands = require("../models/brands.model");

exports.signup = (req, res) => {
  if (!helperFunction.checkEmailPhone(req.body.email)) {
    res.status(500).send({ message: "Invaild Entry" });
  } else {
    let query = {
      name: req.body.username,
      username: req.body.username,
      [helperFunction.checkEmailPhone(req.body.email)]: req.body.email,
      // password: bcrypt.hashSync(req.body.password, 8),
      token: null,
      city: req.body?.city,
      state: req.body?.state,
      country: req.body?.country,
    };
    // console.log("ROLES COMING OR NOT ---->>>>>>", req.body.role);

    if (req.body.role?.length > 0) {
      // console.log("INSIDE THE IF CONDITION");
      Role.find(
        {
          name: { $in: req.body.role },
        },
        (err, roles) => {
          if (err) {
            res.status(500).send({ message: err });
            return;
          }
          query["roles"] = roles.map(role => role._id);
          if (helperFunction.checkEmailPhone(req.body.email) === "phone") {
            query["email"] = "";
          } else if (
            helperFunction.checkEmailPhone(req.body.email) === "email"
          ) {
            query["phone"] = "";
          }
          const user = new User(query);
          user.save((err, userSaved) => {
            if (err) {
              res.status(500).send({ message: err });
              return;
            }
            if (userSaved) {
              res.send({
                message: "User was registered successfully!",
                status: 201,
              });
            }
            return;
          });
        }
      );
    } else {
      // console.log("INSIDE THE ELSE CONDITION");
      Role.findOne({ name: "user" }, (err, role) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }

        query["roles"] = [role._id];
        if (helperFunction.checkEmailPhone(req.body.email) === "phone") {
          query["email"] = "";
        } else if (helperFunction.checkEmailPhone(req.body.email) === "email") {
          query["phone"] = "";
        }
        const user = new User(query);
        user.save((err, userSaved) => {
          if (err) {
            res.status(500).send({ message: err });
            return;
          }
          if (userSaved) {
            res.send({
              message: "User was registered successfully!",
              status: 201,
            });
          }
          return;
        });
      });
    }
  }
};
exports.updateProfile = async (req, res) => {
  console.log("Upcoming data-", req.body);

  let profileFiles = [];

  if (req.files.profileImage) {
    for (let i = 0; i < req.files.profileImage.length; i++) {
      profileFiles.push(req.files.profileImage[i].location);
    }
  }
  const findData = await User.find({ _id: req.body.id });
  if (findData?.length > 0) {
    let query = {
      phone: req.body.phone,
      city: req.body?.city,
      state: req.body?.state,
      country: req.body?.country,
      username: req.body.username,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      email: req.body.email,
      zipCode: req.body.zipCode,
    };

    if (profileFiles.length > 0) {
      query["profileImage"] = profileFiles;
    }

    User.findByIdAndUpdate(req.body.id, query, (err, updated) => {
      if (err) {
        res.status(500).send({
          message:
            "Could not update the status, please try again after sometime",
          reason: err,
        });
        return;
      } else {
        res.status(200).send({ message: "Updated Successfuly", data: updated });
      }
      return;
    });
  } else {
    res.status(200).send({
      message: "User does not exist",
    });
  }
};

exports.signinOtp = (req, res) => {
  if (!helperFunction.checkEmailPhone(req.body.username)) {
    return res.status(500).send({ message: "Invalid Entry" });
  } else {
    User.findOne({
      [helperFunction.checkEmailPhone(req.body.username)]: req.body.username,
    })
      .populate("roles", "-__v")
      .exec((err, user) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        } else if (!user) {
          return res.status(404).send({ message: "User Not found." });
        } else {
          const otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            specialChars: false,
            lowerCaseAlphabets: false,
          });
          if (helperFunction.checkEmailPhone(req.body.username) === "phone") {
            if (req.body.username === "1234567899") {
              User.updateOne(
                {
                  [helperFunction.checkEmailPhone(req.body.username)]:
                    req.body.username,
                },
                {
                  $set: {
                    loginOtp: "123456",
                  },
                }
              ).then(async (updated, err) => {
                if (err) {
                  res.status(500).send({ message: err.message });
                  return;
                } else {
                  // console.log("Send otp on phone functionality");
                  let config = {
                    method: "get",
                    maxBodyLength: Infinity,
                    // url: `http://103.10.234.154/vendorsms/pushsms.aspx?user=thikedaar&password=Y4EMFT9E&msisdn=${`91${req.body.username}`}&sid=THIKDR&msg= Your one time password (OTP) is ${otp} Regard THIKEDAAR DOT COM PVT LTD&fl=0&gwid=2\n`,
                    url: `http://control.yourbulksms.com/api/sendhttp.php?authkey=3237646161617232303155&mobiles=${`91${req.body.username}`}&message=${`Your one time password (OTP) is ${123456} Regard THIKEDAAR DOT COM PVT LTD`}&sender=THIKDR&route=2&country=0&DLT_TE_ID=1207161666918773610`,
                    // headers: {
                    //   Cookie: "ASP.NET_SessionId=jgh41m1vafih33n0itqbpcby",
                    // },
                  };
                  const response = await axios.request(config);
                  // console.log(response)
                  res.status(200).send({
                    message: "OTP send on your Phone",
                    status: 200,
                    otp: "123456",
                    username: req.body.username,
                  });
                }
              });
              return;
            } else {
              User.updateOne(
                {
                  [helperFunction.checkEmailPhone(req.body.username)]:
                    req.body.username,
                },
                {
                  $set: {
                    loginOtp: otp,
                  },
                }
              ).then(async (updated, err) => {
                if (err) {
                  res.status(500).send({ message: err.message });
                  return;
                } else {
                  // console.log("Send otp on phone functionality");
                  let config = {
                    method: "get",
                    maxBodyLength: Infinity,
                    // url: `http://103.10.234.154/vendorsms/pushsms.aspx?user=thikedaar&password=Y4EMFT9E&msisdn=${`91${req.body.username}`}&sid=THIKDR&msg= Your one time password (OTP) is ${otp} Regard THIKEDAAR DOT COM PVT LTD&fl=0&gwid=2\n`,
                    url: `http://control.yourbulksms.com/api/sendhttp.php?authkey=3237646161617232303155&mobiles=${`91${req.body.username}`}&message=${`Your one time password (OTP) is ${otp} Regard THIKEDAAR DOT COM PVT LTD`}&sender=THIKDR&route=2&country=0&DLT_TE_ID=1207161666918773610`,
                    // headers: {
                    //   Cookie: "ASP.NET_SessionId=jgh41m1vafih33n0itqbpcby",
                    // },
                  };
                  const response = await axios.request(config);
                  // console.log(response)
                  res.status(200).send({
                    message: "OTP send on your Phone",
                    status: 200,
                    otp: otp,
                    username: req.body.username,
                  });
                }
              });
              return;
            }
          } else {
            console.log(req.body.username);
            // define the transporter
            var transporter = nodemailer.createTransport({
              service: "Gmail",
              auth: {
                user: "ranjitkvns7@gmail.com",
                pass: "rqezkbtfbfmdrwfn",
              },
            });

            // Define the email
            const mailOptions = email => ({
              from: "Sender",
              to: email,
              subject: "OTP Verification for Login",
              html: `<div>
                         <p>Hello, ${user.username} Your OTP verification code for login in thikedaar.in - </p>
                         <span style="font-weight:bold,background-color:red,color:white">${otp}</span>
                     </div>`,
            });

            // We send the email
            transporter.sendMail(
              mailOptions(user.email),
              function (error, info) {
                if (error) {
                  // console.log(error);
                  res.status(500).send({ message: error.message });
                } else {
                  console.log("otp send on Email");
                  User.updateOne(
                    {
                      [helperFunction.checkEmailPhone(req.body.username)]:
                        req.body.username,
                    },
                    {
                      $set: {
                        loginOtp: otp,
                      },
                    }
                  ).then((updated, err) => {
                    if (err) {
                      res.status(500).send({ message: err.message });
                      return;
                    } else {
                      res.status(200).send({
                        message: "OTP send for login on your Email",
                        status: 200,
                        otp: otp,
                        username: req.body.username,
                      });
                    }
                  });
                  return;
                }
              }
            );
          }
        }
      });
  }
};

exports.signin = (req, res) => {
  if (!helperFunction.checkEmailPhone(req.body.username)) {
    return res.status(500).send({ message: "Invalid Entry" });
  } else {
    User.findOne({
      [helperFunction.checkEmailPhone(req.body.username)]: req.body.username,
    })
      .populate("roles", "-__v")
      .exec((err, user) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        } else if (!user) {
          return res.status(404).send({ message: "User Not found." });
        } else {
          if (user.loginOtp === req.body.otp) {
            let token = jwt.sign({ id: user.id }, config.secret, {
              expiresIn: 86400, // 24 hours
            });

            let authorities = [];
            console.log(user);

            for (let i = 0; i < user.roles.length; i++) {
              authorities.push("ROLE_" + user.roles[i].name.toUpperCase());
            }

            req.session.token = token;

            user.token = token;
            user.save((err, success) => {
              if (err) {
                res
                  .status(500)
                  .send({ message: "Oops, Internal server error" });
                return;
              }
              if (success) {
                res.status(200).send({
                  status: 200,
                  message: "You have been logged in",
                  id: user._id,
                  username: user.username,
                  email: user.email,
                  phone: user.phone,
                  roles: authorities[0],
                  token: token,
                  country: user.country,
                  city: user.city,
                  state: user.state,
                });
                return;
              }
            });
            return;
          } else {
            return res.status(500).send({ message: "Invalid OTP" });
          }
        }
      });
  }
};

exports.signout = async (req, res) => {
  try {
    req.session = null;
    return res.status(200).send({ message: "You've been signed out!" });
  } catch (err) {
    this.next(err);
  }
};

exports.forgotPassword = function (req, res) {
  const { email } = req.body;
  User.findOne({ email }).then((user, err) => {
    if (err) {
      res.status(500).send({ message: err.message });
      return;
    }
    if (user) {
      // define the transporter
      var transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: "divyanshusingh4755@gmail.com",
          pass: "hvxtnrhhsreawglx",
        },
      });

      let random = "pass_" + new Date().getTime();

      // Define the email
      const mailOptions = email => ({
        from: "Sender",
        to: email,
        subject: "Subject",
        // text: `http://localhost:3000/forgot-password/${random}`,
        text: `http://thikedaar.in/forgot-password/${random}`,
      });

      // We send the email
      transporter.sendMail(mailOptions(email), function (error, info) {
        if (error) {
          // console.log(error);
          res.status(500).send({ message: error.message });
        } else {
          console.log("Email sent");
          User.updateOne(
            { email },
            {
              $set: {
                refreshToken: random,
              },
            }
          ).then((updated, err) => {
            if (err) {
              res.status(500).send({ message: err.message });
              return;
            } else {
              res
                .status(200)
                .send({ message: "Email send for password", status: 200 });
            }
          });
        }
      });
    } else {
      res.status(200).send({ message: "Unable to find user" });
      return;
    }
  });
};

exports.changePassword = function (req, res) {
  const { refreshToken, password } = req.body;
  console.log("password reset body---", req.body);
  User.updateOne(
    { refreshToken },
    {
      $set: {
        password: bcrypt.hashSync(password, 8),
      },
    }
  ).then((updated, err) => {
    if (err) {
      res.send(500, err.message);
      return;
    } else {
      res.status(200).send({ message: updated, status: 200 });
    }
  });
};

exports.getallusers = async (req, res) => {
  User.find({}, (err, user) => {
    if (err) {
      res
        .status(500)
        .send({ message: "There was a problem in getting the list of users" });
      return;
    }
    let userData = [];

    res.status(200).send(user);
    return;
  });
};

exports.singleProfile = (req, res) => {
  let id = req.params.id;
  console.log("params_id---------", id);
  User.findById(id, (err, user) => {
    if (err) {
      res.status(500).send({ Error: err });
      return;
    } else {
      if (user) {
        res.status(200).send({
          data: user,
        });
      } else {
        res.status(404).send({
          message: "No user found",
        });
      }
    }
  });
};

exports.getUsersDetails = (req, res) => {
  let id = req.body.id;
  if (id) {
    User.findOne({ _id: id }, (err, user) => {
      if (err) {
        res
          .status(500)
          .send({ message: "The requested data could not be fetched" });
        return;
      } else if (user) {
        const modifiedResponse = {
          _id: user._id,
          profileImage: user.profileImage,
          name: user.name,
          username: user.username,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          city: user.city,
          state: user.state,
          country: user.country,
          countryCode: user.countryCode,
          zipCode: user.zipCode,
          phone: user.phone,
          isExist: user.isExist,
          roles: user.roles,
        };

        res.status(200).send({
          message: "Details feched successfully",
          data: modifiedResponse,
        });
        return;
      } else {
        res
          .status(500)
          .send({ message: "The requested data could not be fetched" });
        return;
      }
    });
  } else {
    User.find({}, (err, user) => {
      if (err) {
        res
          .status(500)
          .send({ message: "The requested data could not be fetched" });
        return;
      } else if (user) {
        res.status(200).send({
          message: "Details feched successfully",
          data: user,
        });
        return;
      } else {
        res
          .status(500)
          .send({ message: "The requested data could not be fetched" });
        return;
      }
    });
  }
};
// login after OTP verification

exports.login = (req, res) => {
  User.findOne({
    phone: req.body.phone,
  }).exec(async (err, user) => {
    console.log(user);
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else if (!user) {
      //CREATE NEW USER
      let role = await Role.find({ name: "user" });
      role = role.filter(el => {
        return el._id;
      });
      User.create(
        { phone: req.body.phone, roles: role._id, status: "ACTIVE" },
        (err, result) => {
          if (err) {
            res.status(500).send({ message: err });
            return;
          } else {
            let token = jwt.sign({ id: result._id }, config.secret, {
              expiresIn: 86400, // 24 hours
            });
            res.status(200).send({
              _id: result._id,
              phone: result.phone,
              isExist: true,
              token: token,
            });
          }
        }
      );
    } else {
      //LOGIN FOR EXISTING USER
      let token = jwt.sign({ id: user._id }, config.secret, {
        expiresIn: 86400, // 24 hours
      });
      let role = await Role.find({ name: "user" });
      role = role.filter(el => {
        return el._id;
      });
      user.roles = role;
      user.token = token;
      user.save((err, result) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        } else {
          res.status(200).send({
            _id: result._id,
            phone: result.phone,
            isExist: result.isExist,
            token: token,
          });
        }
      });
    }
  });
};
// get state list api
exports.getStates = async (req, res) => {
  const { country_name } = req.body;

  try {
    if (country_name) {
      const states = await State.find({ country_name });
      return res.status(200).send({
        states,
      });
    } else {
      const states = await State.find({ country_name: "India" });
      return res.status(200).send({
        states,
      });
    }
  } catch (error) {
    res.status(500).send({ message: error });
    return;
  }
};

// get city list api
exports.getCities = async (req, res) => {
  const { state_name } = req.body;
  try {
    if (state_name) {
      const cities = await City.find({ state_name });
      return res.status(200).send({
        cities,
      });
    } else {
      const cities = await City.find({});
      return res.status(200).send({
        cities,
      });
    }
  } catch (error) {
    res.status(500).send({ message: error });
    return;
  }
};

// get city list api
exports.getCities = async (req, res) => {
  const { state_name } = req.body;
  try {
    if (state_name) {
      const cities = await City.find({ state_name });
      return res.status(200).send({
        cities,
      });
    } else {
      const cities = await City.find({});
      return res.status(200).send({
        cities,
      });
    }
  } catch (error) {
    res.status(500).send({ message: error });
    return;
  }
};
// complete profile for user
exports.completeProfile = (req, res) => {
  let temp = {
    name: req.body.name,
    location: req.body.location,
    isExist: true,
  };
  User.findOneAndUpdate(
    { phone: req.body.phone },
    { $set: temp },
    { new: true }
  ).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else if (user) {
      res.send({ message: "Complete profile successfully!" });
    }
    return;
  });
};

// get profile

// complete profile for user
exports.getProfile = (req, res) => {
  let query = {
    phone: req.query.phone,
  };
  User.findOne(query, {
    name: 1,
    location: 1,
    isExist: 1,
    phone: 1,
    countryCode: 1,
  }).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else if (user) {
      res.send({ message: "Profile details", result: user });
    }
    return;
  });
};

// getprofileData
exports.getprofileData = (req, res) => {
  res.send({ message: "Profile details", result: profileData });
};

// get 2d and 3d images
exports.getProfileDetail = (req, res) => {
  // console.log(req.query);
  switch (req.query.id) {
    case "2":
      let query = { twoDImage: { $ne: null }, threeDImage: { $ne: null } };
      Designs.find(query, { twoDImage: 1, threeDImage: 1 }, (err, designs) => {
        if (err) {
          res.status(500).send({
            message: "Sorry! Something went wrong please try again later",
            data: err,
          });
          return;
        } else {
          res
            .status(200)
            .send({ message: `Designs fetched successfuly`, data: designs });
        }
        return;
      });
      break;

    default:
      res.status(404).send({ message: `Designs fetched successfuly` });
      break;
  }
};

// add wishlist
exports.addWishList = (req, res) => {
  let query = { _id: req.body.designId };
  let update = {};
  if (req.body.wish) {
    update = {
      $push: { wishUser: req.body.userId },
    };
  } else {
    update = {
      $pull: { wishUser: req.body.userId },
    };
  }

  let status = {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
    multi: true,
  };
  Designs.findOneAndUpdate(query, update, status).exec((err, result) => {
    // console.log(err);
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else if (result) {
      res.send({ message: "add successfully" });
    }
    return;
  });
};

// get wishlist api
exports.getWishlist = (req, res) => {
  Designs.find({
    wishUser: { $in: [req.body.userId] },
  }).then((result, err) => {
    // console.log(err, result);
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else {
      res.status(200).send({ message: "add successfully", data: result });
    }
    return;
  });
};

exports.addProductWishList = (req, res) => {
  let query = { _id: req.body.designId };
  let update = {};
  if (req.body.wish) {
    update = {
      $push: { wishUser: req.body.userId },
    };
  } else {
    update = {
      $pull: { wishUser: req.body.userId },
    };
  }

  let status = {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
    multi: true,
  };
  Brands.findOneAndUpdate(query, update, status).exec((err, result) => {
    // console.log(err);
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else if (result) {
      res.send({ message: "add successfully" });
    }
    return;
  });
};

// get wishlist api
exports.getProductWishlist = (req, res) => {
  Brands.find({
    wishUser: { $in: [req.body.userId] },
  }).then((result, err) => {
    // console.log(err, result);
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else {
      res.status(200).send({ message: "add successfully", data: result });
    }
    return;
  });
};

// address api
exports.addAddress = (req, res) => {
  console.log("request", req.body);
  let query = {
    uploadingUser: req.body.uploadingUser,
    address: req.body.address,
    city: req.body.city,
    state: req.body.state,
    zipCode: req.body.zipCode,
    nearBy: req.body.nearBy,
    country: req.body.country,
    phoneNumber: req.body.phoneNumber,
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
  const { id, uploadingUser } = req.body;

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
  } else if (uploadingUser) {
    Address.find({ uploadingUser: uploadingUser }).then((address, err) => {
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

// add likelist
exports.addLikeList = (req, res) => {
  let query = { _id: req.body.designId };
  let update = {};
  if (req.body.like) {
    update = {
      $push: { likeUser: req.body.userId },
    };
  } else {
    update = {
      $pull: { likeUser: req.body.userId },
    };
  }

  let status = {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
    multi: true,
  };

  Designs.findOneAndUpdate(query, update, status, (err, result) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else if (result) {
      res.send({ message: "add successfully" });
    }
    return;
  });
};

// Request for phone number
exports.getRequest = (req, res) => {
  const { orderId } = req.body;

  if (orderId) {
    RaiseRequest.findOne({ orderId }).then((request, err) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      } else {
        res
          .status(200)
          .send({ message: "fetched successfully", data: request });
      }
      return;
    });
  } else {
    RaiseRequest.find({}).then((request, err) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      } else {
        res
          .status(200)
          .send({ message: "fetched successfully", data: request });
      }
      return;
    });
  }
};

exports.requestPhoneNumber = (req, res) => {
  const { orderId, userId, requestRaised, approvalStatus, comment } = req.body;

  let query = {
    orderId,
    userId,
    requestRaised,
    approvalStatus,
    comment,
  };

  RaiseRequest.findOne({ orderId, userId }).then((data, err) => {
    if (data) {
      RaiseRequest.updateOne(
        { orderId, userId },
        {
          $set: query,
        },
        { new: true }
      ).then((request, err) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        } else {
          res
            .status(200)
            .send({ message: "request updated successfully", data: request });
        }
        return;
      });
    } else {
      const saveRequest = new RaiseRequest(query);

      saveRequest.save().then((request, err) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        } else {
          res
            .status(200)
            .send({ message: "request created successfully", data: request });
        }
        return;
      });
    }
  });
};

exports.requestUpdatePhoneNumber = (req, res) => {
  const { id, orderId, userId, approvalStatus, comment } = req.body;

  let query = {
    orderId,
    userId,
    approvalStatus,
    comment,
  };

  RaiseRequest.updateOne(
    { _id: id },
    {
      $set: query,
    },
    { new: true }
  ).then((request, err) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else {
      res
        .status(200)
        .send({ message: "request updated successfully", data: request });
    }
    return;
  });
};

exports.getNextStatus = (req, res) => {
  console.log("calling-");
  let array = [];
  const cleanData = Object.entries(req.body)
    .filter(([key, value]) => value !== undefined)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      array.push({
        [key]: value,
      });
      return obj;
    }, {});

  let query = array.length > 0 ? { $or: array } : {};

  NextStatus.find(query, (err, status) => {
    if (err) {
      res.status(500).send({
        message: "Sorry! Something went wrong please try again later",
        data: err,
      });
      return;
    } else {
      res
        .status(200)
        .send({ message: `Status fetched successfuly`, data: status });
      return;
    }
  });
};

exports.createNextStatus = (req, res) => {
  const { name, label, type } = req.body;

  let query = {
    name,
    label,
    type,
  };

  const saveNextStatus = new NextStatus(query);
  saveNextStatus.save().then((data, err) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else {
      res
        .status(200)
        .send({ message: "data created successfully", data: data });
    }
  });
};

exports.updateNextStatus = (req, res) => {
  const { name, label, type } = req.body;

  let query = {
    name,
    label,
    type,
  };

  NextStatus.updateOne(
    { _id: req.body.id },
    {
      $set: query,
    }
  ).then((request, err) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else {
      res
        .status(200)
        .send({ message: "data updated successfully", data: data });
    }
    return;
  });
};

// initiate payment
exports.initiatePayment = (req, res) => {
  const { orderId, amount, callbackUrl, currency, userId } = req.body;

  // Sandbox Credentials
  let mid = "WBJIwm08119302462954"; // Merchant ID
  let mkey = "Ipb3#Bx%3RdHmr#M"; // Merchant Key
  var paytmParams = {};

  paytmParams.body = {
    requestType: "Payment",
    mid: mid,
    websiteName: "DEFAULT",
    orderId: orderId,
    callbackUrl: callbackUrl,
    txnAmount: {
      value: amount,
      currency: currency,
    },
    userInfo: {
      custId: userId,
    },
  };

  /*
   * Generate checksum by parameters we have in body
   * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys
   */
  PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), mkey).then(
    function (checksum) {
      console.log(checksum);

      paytmParams.head = {
        signature: checksum,
      };

      var post_data = JSON.stringify(paytmParams);

      let data = post_data;
      // console.log(data)

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `https://securegw.paytm.in/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderId}`,
        headers: {
          "Content-Type": "application/json",
        },
        data: data,
      };

      axios
        .request(config)
        .then(response => {
          // console.log(response.data)
          res.status(200).send({ data: response.data });
          return;
        })
        .catch(error => {
          console.log(error);
        });
    }
  );
};

// verify payment
exports.verifyPayment = (req, res) => {
  const {
    architectId,
    designId,
    userId,
    comment,
    orderId,
    contactType,
    productDetail,
    addressId,
    paymentType,
  } = req.body;
  // console.log(req.body);
  // Sandbox Credentials
  let mid = "WBJIwm08119302462954"; // Merchant ID
  let mkey = "Ipb3#Bx%3RdHmr#M"; // Merchant Key

  /* initialize an object */
  var paytmParams = {};

  /* body parameters */
  paytmParams.body = {
    /* Find your MID in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
    mid: mid,

    /* Enter your order id which needs to be check status for */
    orderId: orderId,
  };

  /**
   * Generate checksum by parameters we have in body
   * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys
   */
  PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), mkey).then(
    function (checksum) {
      /* head parameters */
      paytmParams.head = {
        /* put generated checksum value here */
        signature: checksum,
      };

      /* prepare JSON string for request */
      var post_data = JSON.stringify(paytmParams);

      let data = post_data;

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `https://securegw.paytm.in/v3/order/status`,
        headers: {
          "Content-Type": "application/json",
        },
        data: data,
      };

      axios
        .request(config)
        .then(response => {
          console.log(response.data);
          const query = {
            architectId,
            designId,
            userId,
            addressId: addressId ? addressId : null,
            comment,
            contactType,
            paymentType,
            paymentInformation: response.data,
            approvalStatus:
              response.data.body.resultInfo.resultStatus == "TXN_FAILURE" ||
              contactType == "Design Modify"
                ? "Pending"
                : contactType == "Image Download"
                ? "Delivered"
                : "Order Confirmed",
            productDetail,
            otp: Math.floor(Math.random() * 100000) + 1,
          };

          if (
            contactType == "Image Download" ||
            contactType == "Material Purchase"
          ) {
            const saveOrder = new Order(query);
            saveOrder.save((err, orderSaved) => {
              // console.log(err, orderSaved);
              if (err) {
                res.status(500).send({ message: err });
                return;
              }
              if (orderSaved) {
                res.send({
                  message: "Payment Done Successfully",
                  data: orderSaved,
                });
              }
              return;
            });
          } else {
            const saveEnquiry = new EnquiryForm(query);
            saveEnquiry.save((err, enquirySaved) => {
              // console.log(err, enquirySaved);
              if (err) {
                res.status(500).send({ message: err });
                return;
              }
              if (enquirySaved) {
                res.status(200).send({
                  message:
                    "Order sent successfully! You will be contacted soon",
                  data: enquirySaved,
                });
              }
              return;
            });
          }
        })
        .catch(error => {
          console.log(error);
        });
    }
  );
};

// verify payment COD
exports.verifyPaymentCOD = (req, res) => {
  const {
    architectId,
    designId,
    userId,
    comment,
    orderId,
    contactType,
    productDetail,
    addressId,
    paymentType,
    paymentInformation,
  } = req.body;
  const query = {
    architectId,
    designId,
    userId,
    addressId: addressId ? addressId : null,
    comment,
    contactType,
    paymentType,
    paymentInformation: paymentInformation,
    approvalStatus: "Order Confirmed",
    productDetail,
    otp: Math.floor(Math.random() * 100000) + 1,
  };

  if (contactType == "Image Download" || contactType == "Material Purchase") {
    const saveOrder = new Order(query);
    saveOrder.save((err, orderSaved) => {
      console.log(err, orderSaved);
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      if (orderSaved) {
        res.send({
          message: "Order sent successfully! You will be contacted soon",
          data: orderSaved,
        });
      }
      return;
    });
  } else {
    const saveEnquiry = new EnquiryForm(query);
    saveEnquiry.save((err, enquirySaved) => {
      console.log(err, enquirySaved);
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      if (enquirySaved) {
        res.status(200).send({
          message: "Order sent successfully! You will be contacted soon",
          data: enquirySaved,
        });
      }
      return;
    });
  }
};

// order details
exports.orderDetails = (req, res) => {
  let array = [];
  const cleanData = Object.entries(req.body)
    .filter(([key, value]) => value !== undefined)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      array.push({
        [key]: value,
      });
      return obj;
    }, {});

  let query = array.length > 0 ? { $and: array } : {};

  Order.find(query, (err, orders) => {
    if (err) {
      res.status(500).send({
        message: "Sorry! Something went wrong please try again later",
        data: err,
      });
      return;
    }
    res
      .status(200)
      .send({ message: `Orders fetched successfuly`, data: orders });
    return;
  });
};
exports.orderDetailsByData = (req, res) => {
  const { vendor, product } = req.body;
  if (vendor && product) {
    Order.find(
      { "architectId": vendor, "productDetail._id": product },
      (err, orders) => {
        if (err) {
          res.status(500).send({
            message: "Sorry! Something went wrong please try again later",
            data: err,
          });
          return;
        }
        // console.log(orders)
        res
          .status(200)
          .send({ message: `Orders fetched successfuly`, data: orders });
        return;
      }
    );
  } else if (!vendor && product) {
    Order.find({ "productDetail._id": product }, (err, orders) => {
      if (err) {
        res.status(500).send({
          message: "Sorry! Something went wrong please try again later",
          data: err,
        });
        return;
      }
      // console.log(orders)
      res
        .status(200)
        .send({ message: `Orders fetched successfuly`, data: orders });
      return;
    });
  } else if (vendor && !product) {
    Order.find({ architectId: vendor }, (err, orders) => {
      if (err) {
        res.status(500).send({
          message: "Sorry! Something went wrong please try again later",
          data: err,
        });
        return;
      }
      // console.log(orders)
      res
        .status(200)
        .send({ message: `Orders fetched successfuly`, data: orders });
      return;
    });
  } else {
    Order.find({}, (err, orders) => {
      if (err) {
        res.status(500).send({
          message: "Sorry! Something went wrong please try again later",
          data: err,
        });
        return;
      }
      // console.log(orders)
      res
        .status(200)
        .send({ message: `Orders fetched successfuly`, data: orders });
      return;
    });
  }
};

exports.updateOrderStatus = (req, res) => {
  const { approvalStatus, id, comment } = req.body;
  let query = {
    approvalStatus,
    comment,
  };
  let files = [];

  if (req.files.invoicefiles) {
    for (let i = 0; i < req.files.invoicefiles.length; i++) {
      files.push(req.files.invoicefiles[i].location);
    }

    query["invoiceImage"] = files;
  }
  if (req.body.CodPaymentStatus) {
    query["CodPaymentStatus"] = req.body.CodPaymentStatus;
  }

  Order.updateOne(
    { _id: id },
    {
      $set: query,
    },
    (err, orders) => {
      if (err) {
        res.status(500).send({
          message: "Sorry! Something went wrong please try again later",
          data: err,
        });
        return;
      }
      res
        .status(200)
        .send({ message: `Orders updated successfuly`, data: orders });
      return;
    }
  );
};

// Send delivery otp
exports.sendDeliveryOtp = async (req, res) => {
  const { id } = req.body;
  const otp = Math.floor(Math.random() * 100000) + 1;

  findOrder = await Order.findOne({ _id: id });

  if (findOrder?.addressId) {
    const findPhoneNumber = await Address.findOne({
      _id: findOrder?.addressId,
    });
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      // url: `http://103.10.234.154/vendorsms/pushsms.aspx?user=thikedaar&password=Y4EMFT9E&msisdn=${`91${findPhoneNumber?.phoneNumber}`}&sid=THIKDR&msg= Your one time password (OTP) is ${otp} Regard THIKEDAAR DOT COM PVT LTD&fl=0&gwid=2\n`,
      url: `http://control.yourbulksms.com/api/sendhttp.php?authkey=3237646161617232303155&mobiles=${`91${findPhoneNumber?.phoneNumber}`}&message=${`Your one time password (OTP) is ${otp} Regard THIKEDAAR DOT COM PVT LTD`}&sender=THIKDR&route=2&country=0&DLT_TE_ID=1207161666918773610`,
    };

    const response = await axios.request(config);

    Order.updateOne(
      { _id: id },
      {
        $set: {
          otp,
        },
      },
      (err, orders) => {
        if (err) {
          res.status(500).send({
            message: "Sorry! Something went wrong please try again later",
            data: err,
          });
          return;
        }
        res.status(200).send({
          message: `OTP send successfuly`,
          data: JSON.stringify(response.data),
        });
        return;
      }
    );
  } else {
    res.status(500).send({
      message: "Sorry! Please add phone number in delivery address",
      data: err,
    });
    return;
  }
};

// enquiry details
exports.enquiryDetails = (req, res) => {
  let array = [];
  const cleanData = Object.entries(req.body)
    .filter(([key, value]) => value !== undefined)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      array.push({
        [key]: value,
      });
      return obj;
    }, {});

  let query = array.length > 0 ? { $or: array } : {};

  EnquiryForm.find(query, (err, enquiries) => {
    if (err) {
      res.status(500).send({
        message: "Sorry! Something went wrong please try again later",
        data: err,
      });
      return;
    }
    res
      .status(200)
      .send({ message: `Enquiries fetched successfuly`, data: enquiries });
    return;
  });
};

// get likelist
exports.getDesign = (req, res) => {
  let query = [
    {
      $project: {
        _id: 1,
        design: "$$ROOT",
      },
    },
    {
      $replaceRoot: {
        newRoot: { $mergeObjects: [{ count: "$count" }, "$design"] },
      },
    },
    {
      $addFields: {
        likeUser: {
          $cond: {
            if: {
              $ne: [{ $type: "$likeUser" }, "array"],
            },
            then: [],
            else: "$likeUser",
          },
        },
      },
    },
    {
      $addFields: {
        wishUser: {
          $cond: {
            if: {
              $ne: [{ $type: "$wishUser" }, "array"],
            },
            then: [],
            else: "$wishUser",
          },
        },
      },
    },
    {
      $addFields: {
        liked: {
          $in: [mongoose.Types.ObjectId(req.query.userId), "$likeUser"],
        },
      },
    },
    {
      $addFields: {
        wished: {
          $in: [mongoose.Types.ObjectId(req.query.userId), "$wishUser"],
        },
      },
    },
  ];
  Designs.aggregate(query).exec((err, result) => {
    // console.log(err);
    if (err) {
      res.status(500).send({ message: err });
      return;
    } else {
      res.send({ message: "List fetched", data: result });
    }
    return;
  });
};

exports.deleteUserById = (req, res) => {
  let id = req.params.id;
  // console.log(id)
  User.deleteOne({ _id: id }, (err, user) => {
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    }
    res.status(200).send({
      message: "User deleted successfully",
      status: 200,
    });
    return;
  });
};

exports.deleteProductRating = (req, res) => {
  console.log(req.body.id);
  ProductRating.deleteOne({ _id: req.body.id }).then((err, product) => {
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    }
    res.status(200).send({
      message: "Product Rating deleted successfully",
      status: 200,
    });
    return;
  });
};

exports.getProductRatingById = (req, res) => {
  let id = req.body.id;
  console.log(id);
  ProductRating.findOne({ _id: id }, (err, productRating) => {
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    }
    res.status(200).send({
      data: productRating,
      status: 200,
    });
    return;
  });
};

exports.getRatingByProductId = (req, res) => {
  let productid = req.body.productid;
  ProductRating.find({ productid: productid }, (err, productRating) => {
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    }
    res.status(200).send({
      data: productRating,
      status: 200,
    });
    return;
  });
};

exports.postProductRating = (req, res) => {
  const { title, username, productid, rating, comments, userId, date } =
    req.body;
  // console.log(req.body)
  const data = {
    title,
    username,
    productid,
    rating,
    comments,
    userId,
    date,
  };
  ProductRating.find(
    { productid: productid, userId: userId },
    (err, productRating) => {
      if (err) {
        res
          .status(500)
          .send({ message: "The requested data could not be fetched" });
        return;
      } else {
        if (productRating?.length > 0) {
          const dataUpdate = {
            title,
            username,
            productid,
            rating,
            comments,
            userId,
            date,
          };

          ProductRating.updateOne(
            { _id: productRating[0]?._id },
            {
              $set: dataUpdate,
            },
            { new: true, upsert: true },
            (err, updated) => {
              if (err) {
                res
                  .status(500)
                  .send({ message: "Could not find id to update details" });
                return;
              }
              if (updated) {
                res.status(200).send({
                  message: "Product review updated Successfuly",
                  data: updated,
                });
              }
              return;
            }
          );
        } else {
          const productRating = new ProductRating(data);
          productRating.save((err, rating) => {
            if (err) {
              res
                .status(500)
                .send({ message: "Error while saving the details" });
              return;
            }
            res.status(200).send({
              message: "Product review posted successfuly",
              data: rating,
            });
            return;
          });
        }
      }
    }
  );
};

exports.updateProductRating = (req, res) => {
  const { title, username, id, productid, rating, comments, userId } = req.body;

  const dataUpdate = {
    title,
    username,
    productid,
    rating,
    comments,
    userId,
  };

  ProductRating.updateOne(
    { id: req.body.id },
    {
      $set: dataUpdate,
    },
    { new: true, upsert: true },
    (err, updated) => {
      if (err) {
        res
          .status(500)
          .send({ message: "Could not find id to update details" });
        return;
      }
      if (updated) {
        res.status(200).send({ message: "Updated Successfuly", data: updated });
      }
      return;
    }
  );
};

exports.getProductRating = (req, res) => {
  ProductRating.find({}, async (err, data) => {
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    } else if (data) {
      res.status(200).send({
        message: "Product Rating feched successfully",
        data: data,
      });
    } else {
      res.status(404).send({
        message: "Application details not found",
      });
    }

    return;
  });
};
