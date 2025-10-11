const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const { getIO, getOnlineUsers } = require('../../socket');

exports.notifyUser = async ({
  notificationId,
  contents,
  data = {},
  userIds = [],
}) => {
  try {
    // Save notification in DB
    const notification = await Notification.create({
      notificationId,
      contents,
      data,
      sentTo: userIds,
    });

    // Assign notification to users
    await User.updateMany(
      { _id: { $in: userIds } },
      { $addToSet: { notifications: notification._id } }
    );

    const io = getIO();
    const onlineUsers = getOnlineUsers();

    // Send real-time notifications only to online users
    userIds.forEach(id => {
      const sockets = onlineUsers.get(id.toString());
      if (sockets && sockets.size > 0) {
        sockets.forEach(socketId => {
          io.to(socketId).emit('notification', {
            title: contents.title || contents.default || 'New Notification',
            message: contents.message || contents.default || 'New Notification',
            data,
            notificationId,
          });
        });
      }
    });

    // Offline users still have notifications in DB
    return notification;
  } catch (error) {
    console.error('Error creating/assigning notification:', error);
    throw new Error('Failed to create notification');
  }
};
