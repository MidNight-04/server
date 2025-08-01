const Role = require('../models/role.model');
const User = require('../models/user.model');
const { createLogManually } = require('../middlewares/createLog');

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
      userStatus: 'active',
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

exports.deactivateUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { userStatus: 'inactive' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await createLogManually(
      req,
      `Deactivated user ${user.firstname} ${user.lastname} with email ${user.email} and phone ${user.phone}`
    );

    res.status(200).json({
      message: 'User deactivated successfully',
      user,
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res
      .status(500)
      .json({ message: 'Failed to deactivate user', error: error.message });
  }
};
