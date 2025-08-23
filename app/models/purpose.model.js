const { Schema, model } = require('mongoose');

const purposeSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Purpose is required'],
  },
});

module.exports = model('Purpose', purposeSchema);
