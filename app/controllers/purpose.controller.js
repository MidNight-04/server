const Purpose = require('../models/purpose.model');

exports.createPurpose = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Purpose name is required' });
    }

    const trimmedName = name.trim();
    const existingPurpose = await Purpose.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existingPurpose) {
      return res.status(409).json({ message: 'Purpose already exists' });
    }

    const purpose = new Purpose({ name: trimmedName });
    await purpose.save();

    res.status(201).json({
      message: 'Purpose created successfully',
      purpose,
    });
  } catch (error) {
    console.error('Error creating purpose:', error);
    res.status(500).json({
      message: 'Server error while creating purpose',
      error: error.message,
    });
  }
};

exports.getPurposes = async (req, res) => {
  try {
    const purposes = await Purpose.find().sort({ createdAt: -1 });
    res.status(200).json(purposes);
  } catch (error) {
    console.error('Error fetching purposes:', error);
    res.status(500).json({ message: 'Server error fetching purposes.' });
  }
};

exports.getPurposeById = async (req, res) => {
  try {
    const purpose = await Purpose.findById(req.params.id);
    if (!purpose) {
      return res.status(404).json({ message: 'Purpose not found.' });
    }
    res.status(200).json(purpose);
  } catch (error) {
    console.error('Error fetching purpose:', error);
    res.status(500).json({ message: 'Server error fetching purpose.' });
  }
};

exports.updatePurpose = async (req, res) => {
  try {
    const { name } = req.body;
    const purposeId = req.params.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Purpose name is required' });
    }

    const trimmedName = name.trim();
    const existingPurpose = await Purpose.findOne({
      _id: { $ne: purposeId },
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existingPurpose) {
      return res.status(409).json({ message: 'Purpose already exists' });
    }

    const updatedPurpose = await Purpose.findByIdAndUpdate(
      purposeId,
      { name: trimmedName },
      { new: true }
    );

    if (!updatedPurpose) {
      return res.status(404).json({ message: 'Purpose not found.' });
    }

    res.status(200).json({
      message: 'Purpose updated successfully',
      purpose: updatedPurpose,
    });
  } catch (error) {
    console.error('Error updating purpose:', error);
    res.status(500).json({
      message: 'Server error while updating purpose',
      error: error.message,
    });
  }
};

exports.deletePurpose = async (req, res) => {
  try {
    const purposeId = req.params.id;
    const deletedPurpose = await Purpose.findByIdAndDelete(purposeId);

    if (!deletedPurpose) {
      return res.status(404).json({ message: 'Purpose not found.' });
    }

    res.status(200).json({
      message: 'Purpose deleted successfully',
      purpose: deletedPurpose,
    });
  } catch (error) {
    console.error('Error deleting purpose:', error);
    res.status(500).json({
      message: 'Server error while deleting purpose',
      error: error.message,
    });
  }
};

exports.togglePurposeStatus = async (req, res) => {
  try {
    const purposeId = req.params.id;
    const purpose = await Purpose.findById(purposeId);

    if (!purpose) {
      return res.status(404).json({ message: 'Purpose not found.' });
    }

    purpose.isActive = !purpose.isActive;
    await purpose.save();

    res.status(200).json({
      message: 'Purpose status toggled successfully',
      purpose,
    });
  } catch (error) {
    console.error('Error toggling purpose status:', error);
    res.status(500).json({
      message: 'Server error while toggling purpose status',
      error: error.message,
    });
  }
};
