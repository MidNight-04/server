const { Schema, model } = require('mongoose');

const purposeSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
});

const Purpose = model('Purpose', purposeSchema);

module.exports = Purpose;