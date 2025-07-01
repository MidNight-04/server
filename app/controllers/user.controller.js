const Role = require('../models/role.model');
const User = require('../models/user.model');

exports.allAccess = (req, res) => {
  res.status(200).send('Public Content.');
};

exports.userBoard = (req, res) => {
  res.status(200).send('User Content.');
};

exports.adminBoard = (req, res) => {
  res.status(200).send('Admin Content.');
};

exports.moderatorBoard = (req, res) => {
  res.status(200).send('Moderator Content.');
};

exports.getAllUsers = async (req, res) => {
  try {
    const role = await Role.findOne({ name: 'admin' });
    if (!role) {
      return res.status(404).send({ message: 'Admin role not found' });
    }

    const users = await User.find({
      roles: { $ne: role._id },
      isExist: false,
    })
      .populate({
        path: 'roles',
        select: '_id name',
      })
      .select(['firstname', 'lastname', 'employeeID', 'roles']);

    res.status(200).send(users);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};