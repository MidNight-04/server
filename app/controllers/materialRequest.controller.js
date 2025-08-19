const Order = require('../models/materialOrder.model');
const Material = require('../models/material.model.js');

exports.createOrder = async (req, res) => {
  try {
    const {
      orderNumber,
      vendor,
      materials,
      orderDate,
      expectedDeliveryDate,
      status,
    } = req.body;

    if (!orderNumber || !vendor || !materials || materials.length === 0) {
      return res.status(400).json({
        message:
          'Order number, vendor, and at least one material are required.',
      });
    }

    const newOrder = new Order({
      orderNumber,
      vendor,
      materials,
      orderDate,
      expectedDeliveryDate,
      status,
    });

    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error creating order.' });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('vendor', 'name contact')
      .populate('materials.materialId', 'name unit price');

    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error fetching orders.' });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('vendor', 'name contact')
      .populate('materials.materialId', 'name unit price');

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error fetching order.' });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const {
      orderNumber,
      vendor,
      materials,
      orderDate,
      expectedDeliveryDate,
      status,
    } = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        orderNumber,
        vendor,
        materials,
        orderDate,
        expectedDeliveryDate,
        status,
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Server error updating order.' });
  }
};

exports.addMaterialToOrder = async (req, res) => {
  try {
    const { materialId, quantity, price } = req.body;

    if (!materialId || !quantity) {
      return res
        .status(400)
        .json({ message: 'Material ID and quantity are required.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    order.materials.push({ materialId, quantity, price });
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    console.error('Error adding material:', error);
    res.status(500).json({ message: 'Server error adding material.' });
  }
};

exports.removeMaterialFromOrder = async (req, res) => {
  try {
    const { materialId } = req.body;

    if (!materialId) {
      return res.status(400).json({ message: 'Material ID is required.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    order.materials = order.materials.filter(
      item => item.materialId.toString() !== materialId
    );
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    console.error('Error removing material:', error);
    res.status(500).json({ message: 'Server error removing material.' });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);

    if (!deletedOrder) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.status(200).json({ message: 'Order deleted successfully.' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Server error deleting order.' });
  }
};

exports.getOrdersBySite = async (req, res) => {
  try {
    const siteId = req.params.siteId;
    const orders = await Order.find({ siteId })
      .populate('vendor', 'name contact')
      .populate('materials.materialId', 'name unit price');
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders for site:', error);
    res.status(500).json({ message: 'Server error fetching orders for site.' });
  }
};

export const receiveMaterials = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { materials } = req.body;
    // materials can be: [{ materialId, quantity }, ...] or single object

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: 'Invalid request ID' });
    }

    // Normalize materials input to array
    let materialsArray = [];
    if (Array.isArray(materials)) {
      materialsArray = materials;
    } else if (materials && materials.materialId && materials.quantity) {
      materialsArray = [materials];
    } else {
      return res.status(400).json({ message: 'Invalid materials data' });
    }

    const request = await MaterialRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Material request not found' });
    }

    for (const item of materialsArray) {
      const { materialId, quantity } = item;

      if (!mongoose.Types.ObjectId.isValid(materialId)) {
        return res
          .status(400)
          .json({ message: `Invalid material ID: ${materialId}` });
      }

      if (!quantity || quantity <= 0) {
        return res
          .status(400)
          .json({ message: 'Quantity must be greater than zero' });
      }

      // Update stock in Material collection
      const material = await Material.findById(materialId);
      if (!material) {
        return res
          .status(404)
          .json({ message: `Material not found: ${materialId}` });
      }

      material.stock = (material.stock || 0) + quantity;
      await material.save();

      // Log the receiving in the request
      request.receivedMaterials.push({
        materialId,
        quantity,
        receivedAt: new Date(),
      });
    }

    await request.save();

    res.status(200).json({
      message:
        materialsArray.length > 1
          ? 'Bulk materials received successfully'
          : 'Material received successfully',
      request,
    });
  } catch (error) {
    console.error('Error receiving materials:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
