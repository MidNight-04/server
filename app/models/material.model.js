const { Schema, model } = require('mongoose');

const MaterialSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Material name is required'],
      trim: true,
    },
    // description: {
    //   type: String,
    //   trim: true,
    // },
    // unit: {
    //   type: String, // e.g., "kg", "pcs", "liters"
    //   required: [true, 'Unit is required'],
    //   trim: true,
    // },
    // pricePerUnit: {
    //   type: Number,
    //   min: [0, 'Price cannot be negative'],
    // },
    // category: {
    //   type: String,
    //   trim: true, // e.g., "Cement", "Steel", "Electrical"
    // },
    // vendor: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'vendor',
    // },
    // image: {
    //   type: String, // URL or path to the image
    //   trim: true,
    // },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = model('Material', MaterialSchema);
