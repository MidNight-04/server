const db = require('../models');
const config = require('../config/auth.config');
const Member = db.user;
const User = db.user;
const Role = db.role;
const axios = require('axios');
const helperFunction = require('../middlewares/helper');
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
const { default: mongoose } = require('mongoose');
const awsS3 = require('../middlewares/aws-s3');
const { createLogManually } = require('../middlewares/createLog');

exports.signinOtp = (req, res) => {
  if (!helperFunction.checkEmailPhone(req.body.username)) {
    return res.status(500).send({ message: 'Invalid Entry' });
  } else {
    // console.log(helperFunction.checkEmailPhone(req.body.username),req.body.username)
    Member.findOne({
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
            Member.updateOne(
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
            Member.updateOne(
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
              Member.updateOne(
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

exports.signin = async (req, res) => {
  try {
    if (!helperFunction.checkEmailPhone(req.body.username)) {
      return res.status(500).send({ message: 'Invalid Entry' });
    }

    const user = await User.findOne({
      [helperFunction.checkEmailPhone(req.body.username)]: req.body.username,
    })
      .populate('role')
      .exec();

    if (!user) {
      return res.status(404).send({ message: 'User Not found.' });
    }

    if (user.loginOtp !== req.body.otp) {
      return res.status(500).send({ message: 'Invalid OTP' });
    }

    const token = jwt.sign({ id: user.id }, config.secret, {
      expiresIn: 86400, // 24 hours
    });

    req.session.token = token;
    user.token = token;

    await user.save();

    res.status(200).send({
      status: 200,
      message: 'You have been logged in',
      id: user._id,
      username: user.name,
      employeeID: user.employeeID,
      email: user.email,
      phone: user.phone,
      roles:
        user?.role?.name.toLowerCase() === 'admin'
          ? 'ROLE_' + 'PROJECT ' + user.role.name.toUpperCase()
          : 'ROLE_' + user.role.name.toUpperCase(),
      token: token,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { data } = req.body;
    const dataAdd = {
      name: data.name,
      employeeID: data.employeeID,
      role: data.role,
      email: data.email,
      phone: data.phone,
      address: data.address,
    };

    const existingMember = await Member.findOne({
      $or: [
        { employeeID: data.employeeID },
        { email: data.email },
        { phone: data.phone },
      ],
    });
    if (existingMember) {
      return res.status(200).send({ message: 'Record already exists' });
    }
    const member = new Member(dataAdd);
    await member.save();
    await createLogManually(
      req,
      `Created team member ${data.name} with email ${data.email} and phone ${data.phone}`
    );
    return res.status(201).send({ message: 'Record created successfully' });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ message: 'Could not create member' });
  }
};

exports.getAllMember = async (req, res) => {
  try {
    const roles = await Role.find({ name: { $in: ['user', 'Client'] } }).select(
      '_id'
    );
    const roleIds = roles.map(role => role._id);

    const members = await Member.find({ roles: { $nin: roleIds } })
      .populate('roles')
      .sort({ employeeID: 1 });

    return res.status(200).send({
      message: 'List of members fetched successfully',
      data: members,
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return res.status(500).send({
      message: 'There was a problem in getting the list of members',
      error: error.message,
    });
  }
};

exports.getAllActiveMember = async (req, res) => {
  try {
    const roles = await Role.find({
      name: { $in: ['user', 'Client'] },
      userStatus: 'active',
    }).select('_id');
    const roleIds = roles.map(role => role._id);

    const members = await Member.find({ roles: { $nin: roleIds } })
      .populate('roles')
      .sort({ employeeID: 1 });

    return res.status(200).send({
      message: 'List of members fetched successfully',
      data: members,
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return res.status(500).send({
      message: 'There was a problem in getting the list of members',
      error: error.message,
    });
  }
};

exports.deleteMemberById = (req, res) => {
  const id = req.params.id;
  Member.deleteOne({ _id: id }, (err, dealer) => {
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

exports.getMemberById = (req, res) => {
  const id = req.params.id;
  Member.findById(id, (err, data) => {
    if (err) {
      //   console.log(err);
      res.status(500).send({ message: 'Could not find id to get details' });
      return;
    }
    if (data) {
      res.status(200).send({ data: data, status: 200 });
    }
  });
};

exports.updateMemberProfileById = async (req, res) => {
  let profileFiles = [];

  if (req.files?.image?.length > 0) {
    await awsS3
      .uploadFiles(req.files?.image, `profile_photo`)
      .then(async data => {
        const images = data.map(file => {
          const url =
            'https://thekedar-bucket.s3.us-east-1.amazonaws.com/' + file.s3key;
          return url;
        });
        profileFiles.push(...images);
      });
  }

  const findData = await Member.find({ _id: req.params.id });
  if (findData?.length > 0) {
    let query = {
      name: req.body.name,
      employeeID: req.body.employeeID,
      email: req.body.email,
      address: req.body.address,
    };

    if (profileFiles.length > 0) {
      query['profileImage'] = profileFiles;
    }
    // console.log(query)
    const updateProfile = await Member.updateOne(
      { _id: req.params.id },
      { $set: query }
    );
    // console.log(updateProfile)
    if (updateProfile.modifiedCount === 1) {
      await createLogManually(
        req,
        `Updated team member ${findData[0].name} with email ${findData[0].email} and phone ${findData[0].phone}`
      );
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
exports.updateMemberById = (req, res) => {
  const { id, name, employeeID, role, email, phone, address } = req.body;
  const data = {
    name: name,
    employeeID: employeeID,
    role: role,
    email: email,
    phone: phone,
    address: address,
  };
  // Member.findById(id).then(respnse => {
  //   console.log(respnse);
  // });
  Member.updateOne({ _id: id }, data, (err, updated) => {
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

exports.getTeammemberByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const teammembers = await User.find({
      roles: mongoose.Types.ObjectId(role),
    }).populate('roles');
    if (!teammembers || teammembers.length === 0) {
      return res
        .status(404)
        .send({ message: 'No team members found with the given role' });
    }
    res.status(200).send({ data: teammembers, status: 200 });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send({ message: 'Something went wrong while getting the team members' });
  }
};

exports.loginWithPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Member.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({ message: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id }, config.secret, {
      expiresIn: 86400, // 24 hours
    });

    req.session.token = token;
    user.token = token;

    await user.save();

    res.status(200).send({
      status: 200,
      message: 'You have been logged in',
      id: user._id,
      username: user.name,
      employeeID: user.employeeID,
      email: user.email,
      phone: user.phone,
      roles:
        user?.role?.name.toLowerCase() === 'admin'
          ? 'ROLE_' + 'PROJECT ' + user.role.name.toUpperCase()
          : 'ROLE_' + user.role.name.toUpperCase(),
      token: token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Something went wrong' });
  }
};
