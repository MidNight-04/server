const mongoose = require('mongoose');

const projectDocumentModel = mongoose.model(
  'projectDocument',
  new mongoose.Schema(
    {
      name: String,
      siteID: String,
      clientID: String,
      uploadingUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
      },
      ApprovalDate: Date,
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      document: [],
    },
    { timestamps: true }
  )
);

module.exports = projectDocumentModel;
