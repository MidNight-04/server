const { type } = require('@testing-library/user-event/dist/type');
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
        default: 'Pending',
      },
      document: [],
    },
    { timestamps: true }
  )
);

module.exports = projectDocumentModel;
