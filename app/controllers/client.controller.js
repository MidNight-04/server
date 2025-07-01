const db = require('../models');
const User = db.user;
const axios = require('axios');
const config = require('../config/auth.config');
const helperFunction = require('../middlewares/helper');
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const awsS3 = require('../middlewares/aws-s3');
const bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
const Role = require('../models/role.model');

exports.signinOtp = (req, res) => {
  if (!helperFunction.checkEmailPhone(req.body.username)) {
    return res.status(500).send({ message: 'Invalid Entry' });
  } else {
    // console.log(helperFunction.checkEmailPhone(req.body.username),req.body.username)
    User.findOne({
      [helperFunction.checkEmailPhone(req.body.username)]: req.body.username,
    }).exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      } else if (!user) {
        return res.status(404).send({ message: 'User Not found.' });
      } else {
        const otp = otpGenerator.generate(6, {
          upperCaseAlphabets: false,
          specialChars: false,
          lowerCaseAlphabets: false,
        });
        if (helperFunction.checkEmailPhone(req.body.username) === 'phone') {
          if (req.body.username === '1234567899') {
            User.updateOne(
              {
                [helperFunction.checkEmailPhone(req.body.username)]:
                  req.body.username,
              },
              {
                $set: {
                  loginOtp: '123456',
                },
              }
            ).then(async (updated, err) => {
              if (err) {
                res.status(500).send({ message: err.message });
                return;
              } else {
                // console.log("Send otp on phone functionality");
                let config = {
                  method: 'get',
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
                  message: 'OTP send on your Phone',
                  status: 200,
                  otp: '123456',
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
                  method: 'get',
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
                  message: 'OTP send on your Phone',
                  status: 200,
                  otp: otp,
                  username: req.body.username,
                });
              }
            });
            return;
          }
        } else {
          // define the transporter
          var transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
              user: 'ranjitkvns7@gmail.com',
              pass: 'rqezkbtfbfmdrwfn',
              //  user:"kuldeepk87353@gmail.com",
              //   pass:"vleqpatfvdtctups"
            },
          });

          // Define the email
          const mailOptions = email => ({
            from: 'Sender',
            to: email,
            subject: 'OTP Verification for Login',
            html: `<div>
                         <p>Hello, ${user.name} Your OTP verification code for login in thikedaar.in - </p>
                         <span style="font-weight:bold,background-color:red,color:white">${otp}</span>
                     </div>`,
          });

          // We send the email
          transporter.sendMail(mailOptions(user.email), function (error, info) {
            if (error) {
              // console.log(error);
              res.status(500).send({ message: error.message });
            } else {
              console.log('otp send on Email');
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
                    message: 'OTP send for login on your Email',
                    status: 200,
                    otp: otp,
                    username: req.body.username,
                  });
                }
              });
              return;
            }
          });
        }
      }
    });
  }
};

exports.signin = (req, res) => {
  if (!helperFunction.checkEmailPhone(req.body.username)) {
    return res.status(500).send({ message: 'Invalid Entry' });
  } else {
    User.findOne({
      [helperFunction.checkEmailPhone(req.body.username)]: req.body.username,
    })
      .populate('roles')
      .exec((err, user) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        } else if (!user) {
          return res.status(404).send({ message: 'User Not found.' });
        } else {
          if (user.loginOtp === req.body.otp) {
            let token = jwt.sign({ id: user.id }, config.secret, {
              expiresIn: 86400, // 24 hours
            });
            req.session.token = token;

            user.token = token;
            user.save((err, success) => {
              if (err) {
                res
                  .status(500)
                  .send({ message: 'Oops, Internal server error' });
                return;
              }
              if (success) {
                res.status(200).send({
                  status: 200,
                  message: 'You have been logged in',
                  id: user._id,
                  username: user.name,
                  email: user.email,
                  phone: user.phone,
                  // roles: 'ROLE_CLIENT'
                  roles: `ROLE_${user.roles.name.toUpperCase()}`,
                  token: token,
                });
                return;
              }
            });
            return;
          } else {
            return res.status(500).send({ message: 'Invalid OTP' });
          }
        }
      });
  }
};

exports.addClient = async (req, res) => {
  // console.log(req.body)
  const { data } = req.body;
  const dataAdd = {
    firstName: data.firstName,
    lastName: data.lastName,
    username: data.username,
    password: await bcrypt.hash('Password@1', 8),
    email: data.email,
    phone: data.phone,
    city: data.city,
    state: data.state,
    zipCode: data.zipCode,
  };
  //   console.log(dataAdd)
  const findclient = await User.find({
    $or: [{ email: data.email }, { phone: data.phone }],
  });
  //   console.log(findclient)
  if (findclient?.length > 0) {
    res.status(200).send({
      message: 'Record already exist with given Email/Phone',
      status: 204,
    });
  } else {
    let user = new User(dataAdd);
    user.save((err, result) => {
      if (err) {
        res.status(500).send({ message: 'Could not create role' });
        return;
      } else {
        //   console.log(result)
        res
          .status(201)
          .send({ message: 'Record created Successfuly', status: 201 });
      }
      return;
    });
  }
};

exports.updateClientProfileById = async (req, res) => {
  let images = [];

  if (req.files?.image?.length > 0) {
    await awsS3
      .uploadFiles(req.files?.image, `profile_photo`)
      .then(async data => {
        const profileFiles = data.map(file => {
          const url =
            'https://thekedar-bucket.s3.us-east-1.amazonaws.com/' + file.s3key;
          return url;
        });
        images.push(...profileFiles);
      });
  }

  const findData = await User.find({ _id: req.params.id });
  if (findData?.length > 0) {
    let query = {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      address: req.body.address,
      password: await bcrypt.hash('Password@1', 8),
    };

    if (images.length > 0) {
      query['profileImage'] = images;
    }

    const updateProfile = await User.updateOne(
      { _id: req.params.id },
      { $set: query }
    );

    if (updateProfile.modifiedCount === 1) {
      res.json({
        status: 200,
        message: 'Profile Updated Successfuly',
      });
    }
  } else {
    res.status(200).send({
      message: 'User does not exist',
    });
  }
};

exports.getAllClient = async (req, res) => {
  try {
    const role = await Role.findOne({ name: 'Client' });
    if (!role) {
      return res.status(404).send({ message: 'Client role not found' });
    }

    const clients = await User.find({ roles: role._id });

    return res.status(200).send({
      message: 'List of clients fetched successfully',
      data: clients,
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return res.status(500).send({
      message: 'There was a problem in getting the list of clients',
      error: error.message,
    });
  }
};

exports.deleteClientById = (req, res) => {
  const id = req.params.id;
  User.deleteOne({ _id: id }, (err, dealer) => {
    if (err) {
      res
        .status(500)
        .send({ message: 'The requested data could not be fetched' });
      return;
    }
    res.status(200).send({
      message: 'Record delete successfully',
      status: 200,
    });
    return;
  });
};

exports.getClientById = (req, res) => {
  const id = req.params.id;
  User.findById(id, (err, data) => {
    if (err) {
      //   console.log(err);
      res.status(500).send({ message: 'Could not find id to get details' });
      return;
    }
    if (data) {
      res.status(200).send({ data: data });
    }
  });
};

exports.updateClientById = async (req, res) => {
  const { id, name, email, phone, address } = req.body;
  const data = {
    name: name,
    email: email,
    phone: phone,
    address: address,
    password: await bcrypt.hash('Password@1', 8),
  };
  User.updateOne({ _id: id }, data, (err, updated) => {
    if (err) {
      //   console.log(err);
      res.status(500).send({ message: 'Could not find id to update details' });
      return;
    }
    if (updated) {
      res.status(200).send({ message: 'Updated Successfuly' });
    }
  });
};

exports.loginWithPassword = async (req, res) => {
  try {
    const { username, password } = req.body;
    const key = helperFunction.checkEmailPhone(username);
    if (!key) {
      return res.status(400).send({ message: 'Invalid Entry' });
    }

    const user = await User.findOne({ [key]: username }).populate('roles');
    if (!user) {
      return res.status(404).send({ message: 'User Not found.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({ message: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id }, config.secret, {
      expiresIn: 86400,
    }); // 24 hours

    req.session.token = token;
    user.token = token;
    await user.save();

    res.status(200).send({
      status: 200,
      message: 'You have been logged in',
      id: user._id,
      username: user.name,
      email: user.email,
      phone: user.phone,
      roles: user.roles.name,
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send({ message: 'Something went wrong' });
  }
};
