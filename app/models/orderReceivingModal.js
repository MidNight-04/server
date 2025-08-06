const { Schema, model } = require('mongoose');

const orderReceivingSchema = new Schema({
  orderID: {
    type: Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  receivedBy: {
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  },
  products: [
    {
      product: { type: Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true, min: 1 },
    },
  ],
  images: [
    {
      type: String,
      required: true,
    },
  ],
  remarks: [
    {
      type: String,
      required: true,
    },
  ],
  receivedAt: {
    type: Date,
    default: Date.now,
  },
});

const OrderReceiving = model('OrderReceiving', orderReceivingSchema);

module.exports = OrderReceiving;
