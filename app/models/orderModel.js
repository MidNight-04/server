const { Schema, model, Types } = require('mongoose');

const orderSchema = new Schema(
  {
    orderBy: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    siteID: {
      type: Types.ObjectId,
      ref: 'projects',
      required: true,
    },
    purpose: {
      type: Types.ObjectId,
      ref: 'Purpose',
      required: true,
    },
    vendorID: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    products: [
      {
        product: { type: Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'delivered', 'cancelled'],
      default: 'pending',
    },
    gst: {
      type: Boolean,
      default: false,
    },
    invoice: {
      invoiceNumber: {
        type: String,
        required: false,
      },
      invoiceDate: {
        type: Date,
        required: false,
      },
      invoiceAmount: {
        type: Number,
        required: false,
      },
      invoiceFile: {
        type: String,
        required: false,
      },
    },
    remarks: [
      {
        by: {
          type: Types.ObjectId,
          ref: 'User',
          required: true,
        },
        remark: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Order = model('Order', orderSchema);

module.exports = Order;
