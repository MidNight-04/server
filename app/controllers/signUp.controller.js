const User = require('../models/signUp.model');

exports.signUp = async (req, res) => {
  try {
    const { phone, name, userType, companyName, email } = req.body;

    if (!phone || !name || !userType || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Prevent duplicates
    const existing = await User.findOne({
      $or: [{ phone }, { email }],
    });
    if (existing) {
      return res
        .status(409)
        .json({ error: 'User with this phone or email already exists' });
    }

    // Create
    const user = await User.create({
      phone,
      name,
      userType,
      companyName,
      email,
    });

    res.status(201).json({ message: 'User created', user });
  } catch (error) {
    console.error('Error creating user:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};
