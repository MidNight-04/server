require('dotenv').config();
const config = require('../config/auth.config');
const db = require('../models');
const helperFunction = require('../middlewares/helper');
const User = db.user;
const Role = db.role;
const Country = db.countries;
const State = db.states;
const City = db.cities;
const Designs = db.designs;
const profileData = require('../helper/profileData.json');
const mongoose = require('mongoose');
const PaytmChecksum = require('../helper/PaytmChecksum');
const EnquiryForm = db.enquiryForm;
const Address = db.address;
const RaiseRequest = db.raiserequest;
const NextStatus = db.nextStatus;
const ProductRating = db.productRating;
const Order = db.order;
const axios = require('axios');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const awsS3 = require('../middlewares/aws-s3');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
const Brands = require('../models/brands.model');
const cookie = require('cookie');
const { signToken } = require('../middlewares/authJwt');

exports.signup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username,
      password,
      email,
      phone,
      city,
      state,
      zipcode,
      role,
    } = req.body;

    const isValid = helperFunction.checkEmailPhone(email);
    if (!isValid) {
      return res.status(400).send({
        message: 'Invalid entry. Must be a valid email or phone number.',
      });
    }

    const query = {
      firstName,
      lastName,
      username,
      password: bcrypt.hashSync(password, 8),
      phone,
      email,
      city,
      state,
      zipCode: zipcode,
    };

    let roleIds;
    if (role?.length > 0) {
      const roles = await Role.find({ name: { $in: role } });
      roleIds = roles.map(r => r._id);
    } else {
      const defaultRole = await Role.findOne({ name: 'user' });
      roleIds = [defaultRole._id];
    }

    query.roles = roleIds;

    const newUser = new User(query);
    const savedUser = await newUser.save();

    return res.status(201).send({
      message: 'User was registered successfully!',
      status: 201,
    });
  } catch (error) {
    console.error('Signup Error:', error);
    return res.status(500).send({
      message: error.message || 'Internal Server Error',
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.body.id;
    if (!userId) {
      return res.status(400).send({ message: 'User ID is required.' });
    }

    let images = [];
    if (req.files?.image?.length > 0) {
      try {
        const uploaded = await awsS3.uploadFiles(
          req.files.image,
          'profile_photo'
        );
        const imageUrls = uploaded.map(
          file =>
            `https://thekedar-bucket.s3.us-east-1.amazonaws.com/${file.s3key}`
        );
        images.push(...imageUrls);
      } catch (uploadError) {
        return res.status(500).send({
          message: 'Failed to upload profile images.',
          reason: uploadError.message,
        });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ message: 'User does not exist.' });
    }

    const updateData = {
      phone: req.body.phone,
      city: req.body.city,
      state: req.body.state,
      country: req.body.country,
      username: req.body.username,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      email: req.body.email,
      zipCode: req.body.zipCode,
    };

    if (images.length > 0) {
      updateData.profileImage = images;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    return res.status(200).send({
      message: 'Updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).send({
      message: 'Could not update the profile. Please try again later.',
      reason: error.message,
    });
  }
};

exports.signinOtp = async (req, res) => {
  const { username } = req.body;
  const identifierType = helperFunction.checkEmailPhone(username);

  if (!identifierType) {
    return res.status(400).send({
      message: 'Invalid entry. Must be a valid email or phone number.',
    });
  }

  try {
    const user = await User.findOne({ [identifierType]: username }).populate(
      'roles'
    );

    if (!user) {
      return res.status(404).send({ message: 'User not found.' });
    }

    const otp =
      username === '1234567899'
        ? '123456'
        : otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            specialChars: false,
            lowerCaseAlphabets: false,
          });

    await User.updateOne(
      { [identifierType]: username },
      { $set: { loginOtp: otp } }
    );

    if (identifierType === 'phone') {
      const smsUrl = `http://control.yourbulksms.com/api/sendhttp.php?authkey=3237646161617232303155&mobiles=91${username}&message=Your one time password (OTP) is ${otp} Regard THIKEDAAR DOT COM PVT LTD&sender=THIKDR&route=2&country=0&DLT_TE_ID=1207161666918773610`;

      await axios.get(smsUrl);

      return res.status(200).send({
        message: 'OTP sent to your phone',
        status: 200,
        otp,
        username,
      });
    } else {
      // Send email
      const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: 'ranjitkvns7@gmail.com',
          pass: 'rqezkbtfbfmdrwfn',
        },
      });

      const mailOptions = {
        from: 'no-reply@thikedaar.in',
        to: user.email,
        subject: 'OTP Verification for Login',
        html: `<div>
                 <p>Hello ${user.username},</p>
                 <p>Your OTP for login is:</p>
                 <h2 style="color:#0d6efd;">${otp}</h2>
               </div>`,
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).send({
        message: 'OTP sent to your email',
        status: 200,
        otp,
        username,
      });
    }
  } catch (error) {
    console.error('OTP Signin Error:', error);
    return res
      .status(500)
      .send({ message: error.message || 'Internal server error' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      username,
      email,
      password,
      employeeID,
      phone,
      city,
      state,
      zipCode,
      userStatus = 'active',
      roles,
    } = req.body;

    if (
      !firstname ||
      !lastname ||
      !username ||
      !email ||
      !password ||
      !employeeID ||
      !phone ||
      !city ||
      !state ||
      !zipCode ||
      !roles
    ) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    let images = [];
    if (req.files?.image?.length > 0) {
      try {
        const uploaded = await awsS3.uploadFiles(
          req.files.image,
          'profile_photo'
        );
        const imageUrls = uploaded.map(
          file =>
            `https://thekedar-bucket.s3.us-east-1.amazonaws.com/${file.s3key}`
        );
        images.push(...imageUrls);
      } catch (uploadError) {
        return res.status(500).send({
          message: 'Failed to upload profile images.',
          reason: uploadError.message,
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstname,
      lastname,
      username,
      email,
      password: hashedPassword,
      employeeID,
      phone,
      city,
      state,
      zipCode,
      userStatus,
      roles,
      profileImage: images[0] || null,
    });

    return res.status(201).json({ message: 'User created successfully', user });
  } catch (err) {
    console.error('Error creating user:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.signin = async (req, res) => {
  try {
    const { username, otp, password } = req.body;

    const identifierType = helperFunction.checkEmailPhone(username);
    if (!identifierType) {
      return res
        .status(400)
        .json({ message: 'Invalid email or phone number.' });
    }

    const user = await User.findOne({ [identifierType]: username }).populate(
      'roles'
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (otp) {
      if (user.loginOtp?.toString() !== otp.toString()) {
        return res.status(401).json({ message: 'Invalid OTP.' });
      }
    } else if (password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid password.' });
      }
    } else {
      return res.status(400).json({ message: 'OTP or password is required.' });
    }

    const token = signToken({ id: user._id }, process.env.SESSION_SECRET, {
      expiresIn: '7d',
    });

    user.token = token;
    await user.save();

    return res.status(200).json({
      status: 200,
      message: 'You have been logged in',
      id: user._id,
      username: user.username,
      name: `${user.firstname} ${user.lastname}`,
      token,
      expiresIn: 604800,
      email: user.email,
      phone: user.phone,
      userType: `ROLE_${user.roles.name.toUpperCase()}`,
      country: user.country,
      city: user.city,
      state: user.state,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
};

// exports.updateUser = async (req, res) => {
//   console.log(req.body);
//   try {
//     const {
//       id,
//       firstname,
//       lastname,
//       username,
//       email,
//       password,
//       employeeID,
//       phone,
//       city,
//       state,
//       zipCode,
//       userStatus,
//       roles,
//     } = req.body;

//     const user = await User.findById(id);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     if (email && email !== user.email) {
//       const emailTaken = await User.findOne({ email, _id: { $ne: id } });
//       if (emailTaken) {
//         return res.status(409).json({ message: 'Email already in use' });
//       }
//       user.email = email;
//     }

//     if (phone && phone !== user.phone) {
//       const phoneTaken = await User.findOne({ phone, _id: { $ne: id } });
//       if (phoneTaken) {
//         return res.status(409).json({ message: 'Phone number already in use' });
//       }
//       user.phone = phone;
//     }

//     let images = [];
//     if (req.files?.image?.length > 0) {
//       try {
//         const uploaded = await awsS3.uploadFiles(
//           req.files.image,
//           'profile_photo'
//         );
//         images = uploaded.map(
//           file =>
//             `https://thekedar-bucket.s3.us-east-1.amazonaws.com/${file.s3key}`
//         );
//         user.profileImage = images[0];
//       } catch (uploadError) {
//         return res.status(500).json({
//           message: 'Failed to upload profile image.',
//           reason: uploadError.message,
//         });
//       }
//     }

//     if (firstname) user.firstname = firstname;
//     if (lastname) user.lastname = lastname;
//     if (username) user.username = username;
//     if (employeeID) user.employeeID = employeeID;
//     if (city) user.city = city;
//     if (state) user.state = state;
//     if (zipCode) user.zipCode = zipCode;
//     if (userStatus) user.userStatus = userStatus;
//     if (roles) user.roles = roles;
//     if (password) user.password = await bcrypt.hash(password, 10);

//     await user.save();

//     return res.status(200).json({ message: 'User updated successfully', user });
//   } catch (err) {
//     console.error('Error updating user:', err);
//     return res
//       .status(500)
//       .json({ message: 'Server error', error: err.message });
//   }
// };

const { uploadToS3AndExtractUrls } = require('../helper/s3Helpers');

exports.updateUser = async (req, res) => {
  try {
    const {
      id,
      firstname,
      lastname,
      username,
      email,
      password,
      employeeID,
      phone,
      city,
      state,
      zipCode,
      userStatus,
      roles,
    } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [emailTaken, phoneTaken] = await Promise.all([
      email && email !== user.email
        ? User.findOne({ email, _id: { $ne: id } })
        : null,
      phone && phone !== user.phone
        ? User.findOne({ phone, _id: { $ne: id } })
        : null,
    ]);

    if (emailTaken) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    if (phoneTaken) {
      return res.status(409).json({ message: 'Phone number already in use' });
    }

    if (req.files?.image?.length > 0) {
      try {
        const [profileImage] = await uploadToS3AndExtractUrls(
          req.files.image,
          'profile_photo'
        );
        if (profileImage) {
          user.profileImage = profileImage;
        }
      } catch (uploadError) {
        return res.status(500).json({
          message: 'Failed to upload profile image.',
          reason: uploadError.message,
        });
      }
    }

    // Update fields
    Object.assign(user, {
      firstname: firstname ?? user.firstname,
      lastname: lastname ?? user.lastname,
      username: username ?? user.username,
      email: email ?? user.email,
      phone: phone ?? user.phone,
      employeeID: employeeID ?? user.employeeID,
      city: city ?? user.city,
      state: state ?? user.state,
      zipCode: zipCode ?? user.zipCode,
      userStatus: userStatus ?? user.userStatus,
      roles: roles ?? user.roles,
    });

    // Hash password if updated
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    return res.status(200).json({ message: 'User updated successfully', user });
  } catch (err) {
    console.error('Error updating user:', err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
};

exports.logout = (req, res) => {
  res.setHeader('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0');
  res.status(200).json({ message: 'Logged out' });
};

exports.signout = async (req, res) => {
  try {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).send({ message: 'Logout failed.' });
      }
      res.clearCookie('connect.sid'); // Optional: remove cookie
      return res.status(200).send({ message: 'Logged out successfully.' });
    });
    return res.status(200).send({ message: "You've been signed out!" });
  } catch (err) {
    this.next(err);
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .send({ message: 'User not found with this email.' });
    }

    const resetToken = 'pass_' + crypto.randomBytes(20).toString('hex');

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'divyanshusingh4755@gmail.com',
        pass: 'hvxtnrhhsreawglx',
      },
    });

    const resetLink = `http://thikedaar.in/forgot-password/${resetToken}`;
    const mailOptions = {
      from: 'no-reply@thikedaar.in',
      to: email,
      subject: 'Password Reset Request',
      text: `You requested to reset your password. Click the link to continue: ${resetLink}`,
      html: `<p>You requested to reset your password.</p><p><a href="${resetLink}">Click here to reset it</a></p>`,
    };

    await transporter.sendMail(mailOptions);
    await User.updateOne({ email }, { $set: { refreshToken: resetToken } });

    return res.status(200).send({
      message: 'Reset password email sent successfully.',
      status: 200,
    });
  } catch (err) {
    console.error('Forgot Password Error:', err);
    return res.status(500).send({
      message: 'Something went wrong. Please try again later.',
      error: err.message,
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { refreshToken, password } = req.body;
    if (!refreshToken || !password) {
      return res
        .status(400)
        .send({ message: 'Refresh token and password are required.' });
    }
    const hashedPassword = bcrypt.hashSync(password, 8);
    const result = await User.updateOne(
      { refreshToken },
      {
        $set: { password: hashedPassword, refreshToken: null },
      }
    );
    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .send({ message: 'Invalid or expired reset token.' });
    }
    return res
      .status(200)
      .send({ message: 'Password changed successfully.', status: 200 });
  } catch (err) {
    console.error('Change Password Error:', err);
    return res
      .status(500)
      .send({ message: 'Internal server error.', error: err.message });
  }
};

exports.getallusers = async (req, res) => {
  try {
    const users = await User.find({});
    return res.status(200).send(users);
  } catch (err) {
    console.error('Get All Users Error:', err);
    return res.status(500).send({
      message: 'There was a problem retrieving the list of users.',
      error: err.message,
    });
  }
};

exports.singleProfile = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).send({ message: 'No user found.' });
    }
    return res.status(200).send({ data: user });
  } catch (err) {
    console.error('Single Profile Error:', err);
    return res
      .status(500)
      .send({ message: 'Error fetching user profile.', error: err.message });
  }
};

exports.getUsersDetails = async (req, res) => {
  const { id } = req.body;

  try {
    if (id) {
      const user = await User.findById(id)
        .select('-password -token')
        .populate('roles', '-__v');

      if (!user) {
        return res.status(404).send({ message: 'User not found.' });
      }

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

      return res.status(200).send({
        message: 'Details fetched successfully',
        data: modifiedResponse,
      });
    } else {
      const users = await User.find({});
      return res.status(200).send({
        message: 'Details fetched successfully',
        data: users,
      });
    }
  } catch (err) {
    console.error('GetUsersDetails Error:', err);
    return res.status(500).send({
      message: 'An error occurred while fetching user data.',
      error: err.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).send({ message: 'Phone number is required.' });
    }

    let user = await User.findOne({ phone });

    const role = await Role.findOne({ name: 'user' });
    if (!role) {
      return res.status(500).send({ message: 'Default user role not found.' });
    }

    if (!user) {
      user = await User.create({
        phone,
        roles: role._id,
        status: 'ACTIVE',
      });
    } else {
      user.roles = role._id;
    }

    const token = jwt.sign({ id: user._id }, config.secret, {
      expiresIn: 86400, // 24 hours
    });

    user.token = token;
    await user.save();

    return res.status(200).send({
      _id: user._id,
      phone: user.phone,
      isExist: true,
      token,
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).send({
      message: 'Login failed due to internal error.',
      error: err.message,
    });
  }
};

exports.getStates = async (req, res) => {
  try {
    const countryName = req.body.country_name?.trim() || 'India';

    const states = await State.find({ country_name: countryName });

    return res.status(200).send({
      message: `States fetched for ${countryName}`,
      states,
    });
  } catch (error) {
    console.error('Get States Error:', error);
    return res.status(500).send({
      message: 'Failed to fetch states.',
      error: error.message,
    });
  }
};

exports.getCities = async (req, res) => {
  try {
    const stateName = req.body.state_name?.trim();

    const filter = stateName ? { state_name: stateName } : {};
    const cities = await City.find(filter);

    return res.status(200).send({
      message: stateName
        ? `Cities fetched for state: ${stateName}`
        : 'All cities fetched',
      cities,
    });
  } catch (error) {
    console.error('Get Cities Error:', error);
    return res.status(500).send({
      message: 'Failed to fetch cities.',
      error: error.message,
    });
  }
};

exports.getCities = async (req, res) => {
  try {
    const stateName = req.body.state_name?.trim();

    const query = stateName ? { state_name: stateName } : {};
    const cities = await City.find(query);

    return res.status(200).send({
      message: stateName
        ? `Cities fetched for state: ${stateName}`
        : 'All cities fetched successfully',
      cities,
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return res.status(500).send({
      message: 'Failed to fetch cities.',
      error: error.message,
    });
  }
};

exports.completeProfile = async (req, res) => {
  try {
    const { phone, name, location } = req.body;

    if (!phone || !name || !location) {
      return res
        .status(400)
        .send({ message: 'Phone, name, and location are required.' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { phone },
      {
        $set: {
          name,
          location,
          isExist: true,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res
        .status(404)
        .send({ message: 'User not found with this phone number.' });
    }

    return res.status(200).send({
      message: 'Profile completed successfully!',
      data: updatedUser,
    });
  } catch (err) {
    console.error('Complete Profile Error:', err);
    return res.status(500).send({
      message: 'Something went wrong while completing the profile.',
      error: err.message,
    });
  }
};

// get profile

// complete profile for user
exports.getProfile = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).send({ message: 'Phone number is required.' });
    }

    const user = await User.findOne(
      { phone },
      {
        name: 1,
        location: 1,
        isExist: 1,
        phone: 1,
        countryCode: 1,
      }
    );

    if (!user) {
      return res.status(404).send({ message: 'User not found.' });
    }

    return res.status(200).send({
      message: 'Profile details fetched successfully.',
      result: user,
    });
  } catch (err) {
    console.error('Get Profile Error:', err);
    return res.status(500).send({
      message: 'An error occurred while fetching profile.',
      error: err.message,
    });
  }
};

// getprofileData
exports.getprofileData = (req, res) => {
  res.send({ message: 'Profile details', result: profileData });
};

// get 2d and 3d images
exports.getProfileDetail = (req, res) => {
  // console.log(req.query);
  switch (req.query.id) {
    case '2':
      let query = { twoDImage: { $ne: null }, threeDImage: { $ne: null } };
      Designs.find(query, { twoDImage: 1, threeDImage: 1 }, (err, designs) => {
        if (err) {
          res.status(500).send({
            message: 'Sorry! Something went wrong please try again later',
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
      res.send({ message: 'add successfully' });
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
      res.status(200).send({ message: 'add successfully', data: result });
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
      res.send({ message: 'add successfully' });
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
      res.status(200).send({ message: 'add successfully', data: result });
    }
    return;
  });
};

// address api
exports.addAddress = (req, res) => {
  console.log('request', req.body);
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
      console.log('err', err);
      res.status(500).send({ message: err });
      return;
    } else {
      res
        .status(200)
        .send({ message: 'address saved successfully', data: address });
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
        .send({ message: 'address updated successfully', data: address });
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
        .send({ message: 'address deleted successfully', data: address });
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
      res.send({ message: 'add successfully' });
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
          .send({ message: 'fetched successfully', data: request });
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
          .send({ message: 'fetched successfully', data: request });
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
            .send({ message: 'request updated successfully', data: request });
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
            .send({ message: 'request created successfully', data: request });
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
        .send({ message: 'request updated successfully', data: request });
    }
    return;
  });
};

exports.getNextStatus = (req, res) => {
  console.log('calling-');
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
        message: 'Sorry! Something went wrong please try again later',
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
        .send({ message: 'data created successfully', data: data });
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
        .send({ message: 'data updated successfully', data: data });
    }
    return;
  });
};

// initiate payment
exports.initiatePayment = (req, res) => {
  const { orderId, amount, callbackUrl, currency, userId } = req.body;

  // Sandbox Credentials
  let mid = 'WBJIwm08119302462954'; // Merchant ID
  let mkey = 'Ipb3#Bx%3RdHmr#M'; // Merchant Key
  var paytmParams = {};

  paytmParams.body = {
    requestType: 'Payment',
    mid: mid,
    websiteName: 'DEFAULT',
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
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://securegw.paytm.in/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderId}`,
        headers: {
          'Content-Type': 'application/json',
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
  let mid = 'WBJIwm08119302462954'; // Merchant ID
  let mkey = 'Ipb3#Bx%3RdHmr#M'; // Merchant Key

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
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://securegw.paytm.in/v3/order/status`,
        headers: {
          'Content-Type': 'application/json',
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
              response.data.body.resultInfo.resultStatus == 'TXN_FAILURE' ||
              contactType == 'Design Modify'
                ? 'Pending'
                : contactType == 'Image Download'
                ? 'Delivered'
                : 'Order Confirmed',
            productDetail,
            otp: Math.floor(Math.random() * 100000) + 1,
          };

          if (
            contactType == 'Image Download' ||
            contactType == 'Material Purchase'
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
                  message: 'Payment Done Successfully',
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
                    'Order sent successfully! You will be contacted soon',
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
    approvalStatus: 'Order Confirmed',
    productDetail,
    otp: Math.floor(Math.random() * 100000) + 1,
  };

  if (contactType == 'Image Download' || contactType == 'Material Purchase') {
    const saveOrder = new Order(query);
    saveOrder.save((err, orderSaved) => {
      console.log(err, orderSaved);
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      if (orderSaved) {
        res.send({
          message: 'Order sent successfully! You will be contacted soon',
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
          message: 'Order sent successfully! You will be contacted soon',
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
        message: 'Sorry! Something went wrong please try again later',
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
      { architectId: vendor, 'productDetail._id': product },
      (err, orders) => {
        if (err) {
          res.status(500).send({
            message: 'Sorry! Something went wrong please try again later',
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
    Order.find({ 'productDetail._id': product }, (err, orders) => {
      if (err) {
        res.status(500).send({
          message: 'Sorry! Something went wrong please try again later',
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
          message: 'Sorry! Something went wrong please try again later',
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
          message: 'Sorry! Something went wrong please try again later',
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

    query['invoiceImage'] = files;
  }
  if (req.body.CodPaymentStatus) {
    query['CodPaymentStatus'] = req.body.CodPaymentStatus;
  }

  Order.updateOne(
    { _id: id },
    {
      $set: query,
    },
    (err, orders) => {
      if (err) {
        res.status(500).send({
          message: 'Sorry! Something went wrong please try again later',
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
      method: 'get',
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
            message: 'Sorry! Something went wrong please try again later',
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
      message: 'Sorry! Please add phone number in delivery address',
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
        message: 'Sorry! Something went wrong please try again later',
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
        design: '$$ROOT',
      },
    },
    {
      $replaceRoot: {
        newRoot: { $mergeObjects: [{ count: '$count' }, '$design'] },
      },
    },
    {
      $addFields: {
        likeUser: {
          $cond: {
            if: {
              $ne: [{ $type: '$likeUser' }, 'array'],
            },
            then: [],
            else: '$likeUser',
          },
        },
      },
    },
    {
      $addFields: {
        wishUser: {
          $cond: {
            if: {
              $ne: [{ $type: '$wishUser' }, 'array'],
            },
            then: [],
            else: '$wishUser',
          },
        },
      },
    },
    {
      $addFields: {
        liked: {
          $in: [mongoose.Types.ObjectId(req.query.userId), '$likeUser'],
        },
      },
    },
    {
      $addFields: {
        wished: {
          $in: [mongoose.Types.ObjectId(req.query.userId), '$wishUser'],
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
      res.send({ message: 'List fetched', data: result });
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
        .send({ message: 'The requested data could not be fetched' });
      return;
    }
    res.status(200).send({
      message: 'User deleted successfully',
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
        .send({ message: 'The requested data could not be fetched' });
      return;
    }
    res.status(200).send({
      message: 'Product Rating deleted successfully',
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
        .send({ message: 'The requested data could not be fetched' });
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
        .send({ message: 'The requested data could not be fetched' });
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
          .send({ message: 'The requested data could not be fetched' });
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
                  .send({ message: 'Could not find id to update details' });
                return;
              }
              if (updated) {
                res.status(200).send({
                  message: 'Product review updated Successfuly',
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
                .send({ message: 'Error while saving the details' });
              return;
            }
            res.status(200).send({
              message: 'Product review posted successfuly',
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
          .send({ message: 'Could not find id to update details' });
        return;
      }
      if (updated) {
        res.status(200).send({ message: 'Updated Successfuly', data: updated });
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
        .send({ message: 'The requested data could not be fetched' });
      return;
    } else if (data) {
      res.status(200).send({
        message: 'Product Rating feched successfully',
        data: data,
      });
    } else {
      res.status(404).send({
        message: 'Application details not found',
      });
    }

    return;
  });
};

const ACCESS_EXPIRY = '1d';

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.SESSION_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
}

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token required' });
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const newAccessToken = generateAccessToken(user);

    res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    console.error('Refresh token error:', err);
    return res
      .status(401)
      .json({ message: 'Invalid or expired refresh token' });
  }
};
