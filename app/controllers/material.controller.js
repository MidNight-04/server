const Material = require('../models/material.model');
const { createLogManually } = require('../middlewares/createLog');

exports.createMaterial = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Material name is required' });
    }

    const trimmedName = name.trim();
    const existingMaterial = await Material.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existingMaterial) {
      return res.status(409).json({ message: 'Material already exists' });
    }

    const material = new Material({ name: trimmedName });
    await material.save();

    createLogManually(req, `New Material Added: ${trimmedName}`);

    res.status(201).json({
      message: 'Material created successfully',
      material,
    });
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({
      message: 'Server error while creating material',
      error: error.message,
    });
  }
};

exports.getMaterials = async (req, res) => {
  try {
    const materials = await Material.find().sort({ createdAt: -1 });
    res.status(200).json(materials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ message: 'Server error fetching materials.' });
  }
};

exports.getMaterialById = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found.' });
    }
    res.status(200).json(material);
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({ message: 'Server error fetching material.' });
  }
};

exports.updateMaterial = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Material name is required' });
    }
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { name },
      {
        new: true,
      }
    );
    if (!material) {
      return res.status(404).json({ message: 'Material not found.' });
    }

    createLogManually(req, `Material Updated: ${material.name}`);

    res
      .status(200)
      .json({ message: 'Material updated successfully', material });
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ message: 'Server error updating material.' });
  }
};

exports.deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    createLogManually(req, `Material Deleted: ${material.name}`);
    await Material.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Material deleted successfully.' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ message: 'Server error deleting material.' });
  }
};

exports.getActiveMaterials = async (req, res) => {
  try {
    const materials = await Material.find({ active: true }).sort({
      createdAt: -1,
    });
    res.status(200).json(materials);
  } catch (error) {
    console.error('Error fetching active materials:', error);
    res
      .status(500)
      .json({ message: 'Server error fetching active materials.' });
  }
};

exports.toggleMaterialStatus = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found.' });
    }
    material.isActive = !material.isActive;
    await material.save();

    createLogManually(
      req,
      `Material Status Changed To: ${material.isActive ? 'Active' : 'Not Active'}`
    );
    res
      .status(200)
      .json({ message: 'Material status updated successfully.', material });
  } catch (error) {
    console.error('Error toggling material status:', error);
    res.status(500).json({ message: 'Server error toggling material status.' });
  }
};
