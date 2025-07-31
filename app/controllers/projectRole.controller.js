const db = require('../models');
const RoleModel = db.role;

exports.addProjectRole = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).send({ message: 'Role name is required' });
  }

  try {
    // Check for duplicate (case-insensitive)
    const existingRole = await RoleModel.findOne({
      name: { $regex: `^${name}$`, $options: 'i' },
    });

    if (existingRole) {
      return res.status(200).send({ message: 'Role already exists' });
    }

    // Create new role
    const role = new RoleModel({ name });
    const result = await role.save();

    // Log the creation
    await createLogManually(req, `Created role "${result.name}".`);

    return res.status(201).send({ message: 'Role created successfully' });
  } catch (err) {
    console.error('Error creating role:', err);
    return res.status(500).send({ message: 'Could not create role' });
  }
};

exports.getAllRole = (req, res) => {
  RoleModel.find({ name: { $ne: 'admin' } }).then((role, err) => {
    if (err) {
      res.status(500).send({
        message: 'There was a problem in getting the list of role',
      });
      return;
    }
    if (role) {
      res.status(200).send({
        message: 'List of role fetched successfuly',
        data: role,
      });
    }
  });
  return;
};

exports.deleteProjectRoleById = async (req, res) => {
  const id = req.params.id;

  try {
    const role = await RoleModel.findById(id);
    if (!role) {
      return res.status(404).send({ message: 'Role not found' });
    }

    await RoleModel.deleteOne({ _id: id });

    await createLogManually(req, `Deleted role "${role.name}".`);

    return res.status(200).send({
      message: 'Record deleted successfully',
      status: 200,
    });
  } catch (err) {
    console.error('Error deleting role:', err);
    return res.status(500).send({
      message: 'An error occurred while deleting the role',
    });
  }
};

exports.getProjectRoleById = (req, res) => {
  const id = req.params.id;
  RoleModel.findById(id, (err, data) => {
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

exports.updateProjectRoleById = async (req, res) => {
  const { id, role } = req.body;

  try {
    const existingRole = await RoleModel.findById(id);
    if (!existingRole) {
      return res.status(404).send({ message: 'Role not found' });
    }

    // Check for duplicate role name
    const duplicate = await RoleModel.findOne({ name: role });
    if (duplicate && duplicate._id.toString() !== id) {
      return res.status(400).send({ message: 'Role name already exists' });
    }

    await RoleModel.updateOne({ _id: id }, { name: role });

    await createLogManually(
      req,
      `Updated role "${existingRole.name}" to "${role}".`
    );

    return res.status(200).send({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Error updating role:', error);
    return res.status(500).send({ message: 'Failed to update role' });
  }
};
