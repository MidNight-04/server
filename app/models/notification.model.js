const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notificationId: { type: String, required: true }, // OneSignal notification ID
  contents: {
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  }, // User-visible messages
  data: { type: Object }, // App payload for routing/actions
  includedSegments: { type: [String], default: [] },
  sentTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  openedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dismissedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
