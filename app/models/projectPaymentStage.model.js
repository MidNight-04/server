const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema(
  {
    stage: { type: String, required: true },
    payment: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    }, // optional
    dueDate: { type: Date }, // optional
  },
  { _id: false } // don’t auto-create _id for each stage
);

const projectPaymentStagesSchema = new mongoose.Schema(
  {
    siteID: { type: String, required: true },
    clientID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'clients',
      required: true,
    },
    floor: { type: String },
    stages: { type: [stageSchema], default: [] },
  },
  { timestamps: true }
);

const ProjectPaymentStages = mongoose.model(
  'projectPaymentStages',
  projectPaymentStagesSchema
);

module.exports = ProjectPaymentStages;
