const Roles = require('../models/role.model');

exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Roles.find({name: {$ne: 'admin'}}).select('name _id').sort({ name: 1 });
    res
      .status(200)
      .json({ message: 'Roles retrieved successfully', data: roles });
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Failed to retrieve roles', error: err.message });
  }
};
