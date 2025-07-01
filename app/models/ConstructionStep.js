const mongoose = require('mongoose');

const StepPointSchema = new mongoose.Schema({
  point: Number,
  content: String,
  issueMember: [String],
  duration: Number,
  checklist: String,
  checklistName: String,
});

const ConstructionStepSchema = new mongoose.Schema({
  name: { type: String, required: true },
  priority: String,
  points: [StepPointSchema],
  order: { type: Number, required: true },
});

module.exports = mongoose.model(
  'ConstructionStepOrder',
  ConstructionStepSchema
);
