const { default: vendorModel } = require('../models/vendor.model');
const Vendor = require('../models/vendor.model');

exports.createVendor = async (req, res) => {
  try {
    const { name, phone, email, address, gstNumber } = req.body;

    if (!name || !address) {
      return res.status(400).json({ message: 'Name and address are required' });
    }

    if (phone && !/^\+?[0-9]{7,15}$/.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    if (
      email &&
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
    ) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    vendorModel;

    const existingVendor = await Vendor.findOne({
      $or: [{ phone }, { email }, { gstNumber }],
    });

    if (existingVendor) {
      return res.status(409).json({
        message: 'Vendor already exists with given phone, email, or GST',
      });
    }

    const vendor = new Vendor({ name, phone, email, address, gstNumber });
    const savedVendor = await vendor.save();

    return res.status(201).json({
      message: 'Vendor created successfully',
      vendor: savedVendor,
    });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return res
      .status(500)
      .json({ message: 'Error creating vendor', error: error.message });
  }
};

exports.getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.json(vendors);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching vendors', error: error.message });
  }
};

exports.getActiveVendors = async (req, res) => {
  try {
    const activeVendors = await Vendor.find({ isActive: true })
      .sort({ createdAt: -1 })
      .select('name phone email address gstNumber isActive createdAt');
    console.log(activeVendors);

    if (!activeVendors.length) {
      return res
        .status(200)
        .json({ message: 'No active vendors found', vendors: [] });
    }

    res.json({ vendors: activeVendors });
  } catch (error) {
    console.error('Error fetching active vendors:', error);
    res.status(500).json({
      message: 'Error fetching active vendors',
      error: error.message,
    });
  }
};

exports.getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json(vendor);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching vendor', error: error.message });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const { name, phone, email, address, gstNumber } = req.body;

    // Validate
    if (phone && !/^\+?[0-9]{7,15}$/.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }
    if (
      email &&
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
    ) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Update fields
    if (name) vendor.name = name;
    if (phone) vendor.phone = phone;
    if (email) vendor.email = email;
    if (address) vendor.address = address;
    if (gstNumber) vendor.gstNumber = gstNumber;

    const updatedVendor = await vendor.save();

    res.json({ message: 'Vendor updated successfully', vendor: updatedVendor });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error updating vendor', error: error.message });
  }
};

exports.toggleVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Flip active status
    vendor.isActive = !vendor.isActive;
    await vendor.save();

    res.json({
      message: `Vendor has been ${
        vendor.isActive ? 'activated' : 'deactivated'
      } successfully`,
      vendor,
    });
  } catch (error) {
    console.error('Error toggling vendor status:', error);
    res.status(500).json({
      message: 'Error toggling vendor status',
      error: error.message,
    });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    await vendor.deleteOne();
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error deleting vendor', error: error.message });
  }
};
