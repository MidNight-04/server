const { Schema, model } = require('mongoose');

// const productSchema = new Schema(
//   {
//     name: {
//       type: String,
//       required: [true, 'Product name is required'],
//       trim: true,
//     },
//     price: {
//       type: Number,
//       required: [true, 'Product price is required'],
//       min: [0, 'Price must be a positive number'],
//     },
//     description: {
//       type: String,
//       required: [true, 'Product description is required'],
//       trim: true,
//     },
//     image: {
//       type: String,
//       required: [true, 'Product image URL is required'],
//     },
//     category: {
//       type: String,
//       required: [true, 'Product category is required'],
//       trim: true,
//     },
//     measurement: {
//       type: String,
//       required: [true, 'Product measurement unit is required'],
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

const productSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
});

const Product = model('Product', productSchema);

module.exports = Product;
