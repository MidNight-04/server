const mongoose = require('mongoose');

const logModel = mongoose.model(
  'projectlogs',
  new mongoose.Schema(
    {
      log: String,
      date: { type: String, required: true, default: Date.now },
      siteID: String,
      taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
      ticketId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tickets',
      },
      materialRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MaterialRequest',
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
      },
    },
    { timestamps: true }
  )
);

module.exports = logModel;
