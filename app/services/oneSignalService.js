require('dotenv').config();
const axios = require('axios');
const Notification = require('../models/notification.model');
const { notifyUser } = require('./notificationService');

async function sendNotification({ users, title, message, data = {} }) {
  if (!users || users.length === 0) throw new Error('No users provided');

  // const playerIds = users.flatMap(u => u.playerIds || []).filter(Boolean);
  // if (playerIds.length === 0) {
  //   console.log('No playerIds available for users');
  //   // throw new Error('No playerIds available for users');
  //   return;
  // }

  const body = {
    app_id: `${process.env.ONESIGNAL_APP_ID}`,
    // include_player_ids: ['955ff67e-50b3-43e9-9b11-a6766fae0ca9'],
    include_player_ids: playerIds,
    headings: { en: title },
    contents: { en: message },
  };

  console.log(body);

  try {
    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
        },
      }
    );
    const notificationId = response.data.id;
    const userIds = users.map(u => u._id);
    const notification = await notifyUser({
      notificationId,
      contents: { title, message },
      data,
      // userIds: ['65362fba3ffa1cad30f53bac'],
      userIds,
    });
    return notification;
  } catch (error) {
    console.error(
      'Error sending notification:',
      error.response?.data || error.message
    );
    throw error;
  }
}

// ----------------------------
// Webhook Handler
// ----------------------------
/**
 * payload: object from OneSignal webhook
 * Expected keys: notification_id, player_id, opened, dismissed, user_id
 */
async function handleWebhook(payload) {
  const { notification_id, player_id, opened, dismissed, user_id } = payload;
  if (!notification_id || !user_id) return;

  const notif = await Notification.findOne({ notificationId: notification_id });
  if (!notif) return;

  if (opened) {
    // Avoid duplicates
    if (!notif.openedBy.some(o => o.userId.toString() === user_id)) {
      notif.openedBy.push({ userId: user_id });
    }
  }

  if (dismissed) {
    if (!notif.dismissedBy.some(d => d.userId.toString() === user_id)) {
      notif.dismissedBy.push({ userId: user_id });
    }
  }

  await notif.save();
}

// ----------------------------
// Cleanup old notifications
// ----------------------------
async function cleanupOldNotifications(days = 90) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await Notification.deleteMany({ createdAt: { $lt: cutoff } });
  console.log(`Deleted ${result.deletedCount} old notifications`);
}

module.exports = {
  sendNotification,
  handleWebhook,
  cleanupOldNotifications,
};
