const Role = require('../models/role.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const { createLogManually } = require('../middlewares/createLog');
const mongoose = require('mongoose');

exports.allAccess = (req, res) => {
  res.status(200).send('Public Content.');
};

exports.userBoard = (req, res) => {
  res.status(200).send('User Content.');
};

exports.adminBoard = (req, res) => {
  res.status(200).send('Admin Content.');
};

exports.moderatorBoard = (req, res) => {
  res.status(200).send('Moderator Content.');
};

exports.getAllUsers = async (req, res) => {
  try {
    const role = await Role.findOne({ name: 'admin' });
    if (!role) {
      return res.status(404).send({ message: 'Admin role not found' });
    }

    const users = await User.find({
      roles: { $ne: role._id },
      isExist: false,
      userStatus: 'active',
    })
      .populate({
        path: 'roles',
        select: '_id name',
      })
      .select(['firstname', 'lastname', 'employeeID', 'roles']);

    res.status(200).send(users);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.deactivateUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { userStatus: 'inactive' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await createLogManually(
      req,
      `Deactivated user ${user.firstname} ${user.lastname} with email ${user.email} and phone ${user.phone}`
    );

    res.status(200).json({
      message: 'User deactivated successfully',
      user,
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res
      .status(500)
      .json({ message: 'Failed to deactivate user', error: error.message });
  }
};

const toggleUserStatus = async id => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid user ID');
  }

  // Find user first
  const user = await User.findById(id);
  if (!user) {
    throw new Error('User not found');
  }

  // Toggle logic
  const newStatus = user.userStatus === 'active' ? 'inactive' : 'active';
  user.userStatus = newStatus;
  await user.save();

  return user;
};

exports.toggleUserStatusById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await toggleUserStatus(id);

    // Log toggle action (not blocking response)
    try {
      await createLogManually(
        req,
        `Toggled user ${user.firstname} ${user.lastname} (email: ${user.email}, phone: ${user.phone}) to status "${user.userStatus}"`
      );
    } catch (logError) {
      console.warn('Failed to create log:', logError.message);
    }

    res.status(200).json({
      message: `User status toggled successfully to ${user.userStatus}`,
      user,
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    const status =
      error.message === 'Invalid user ID'
        ? 400
        : error.message === 'User not found'
        ? 404
        : 500;

    res.status(status).json({
      message: error.message || 'Failed to toggle user status',
    });
  }
};

exports.addPlayerId = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId || req.body?.userId;
    const { playerId } = req.params;

    if (!userId || !playerId) {
      return res
        .status(400)
        .json({ message: 'User ID and player ID are required' });
    }

    // Find user and update playerIds if not already present
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Avoid duplicates
    if (!user.playerIds.includes(playerId)) {
      user.playerIds.push(playerId);
      await user.save();
    }

    return res.status(200).json({
      message: 'Player ID added successfully',
      playerIds: user.playerIds,
    });
  } catch (error) {
    console.error('Error adding player ID:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.removePlayerId = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.userId;
    const { playerId } = req.params;

    if (!userId || !playerId) {
      return res
        .status(400)
        .json({ message: 'User ID and player ID are required' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { playerIds: playerId } },
      { new: true }
    );

    return res.status(200).json({
      message: 'Player ID removed successfully',
      playerIds: user.playerIds,
    });
  } catch (error) {
    console.error('Error removing player ID:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId || req.body?.userId;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Aggregate notifications sent to this user
    const results = await Notification.aggregate([
      { $match: { sentTo: userObjectId } },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          notifications: [
            {
              $project: {
                notificationId: 1,
                contents: 1,
                data: 1,
                includedSegments: 1,
                sentTo: 1,
                openedBy: 1,
                dismissedBy: 1,
                createdAt: 1,
                isRead: { $in: [userObjectId, '$openedBy'] },
                isDismissed: { $in: [userObjectId, '$dismissedBy'] },
              },
            },
          ],
          counts: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                readCount: {
                  $sum: { $cond: [{ $in: [userObjectId, '$openedBy'] }, 1, 0] },
                },
                dismissedCount: {
                  $sum: {
                    $cond: [{ $in: [userObjectId, '$dismissedBy'] }, 1, 0],
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                total: 1,
                readCount: 1,
                dismissedCount: 1,
                unreadCount: {
                  $subtract: [
                    '$total',
                    { $add: ['$readCount', '$dismissedCount'] },
                  ],
                },
              },
            },
          ],
        },
      },
    ]);

    const notifications = results[0]?.notifications || [];
    const counts = results[0]?.counts?.[0] || {
      total: 0,
      readCount: 0,
      unreadCount: 0,
      dismissedCount: 0,
    };

    return res.status(200).json({
      ...counts,
      notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications (aggregate):', error);
    return res.status(500).json({
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId || req.body?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID required' });
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      { $addToSet: { openedBy: userId } }, // Prevent duplicate entries
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.status(200).json({ message: 'Marked as read', notification });
  } catch (error) {
    console.error('❌ Error marking as read:', error);
    return res.status(500).json({ message: 'Failed to mark as read' });
  }
};

exports.markAsDismissed = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId || req.body?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID required' });
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      { $addToSet: { dismissedBy: userId } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res
      .status(200)
      .json({ message: 'Notification dismissed', notification });
  } catch (error) {
    console.error('❌ Error dismissing notification:', error);
    return res.status(500).json({ message: 'Failed to dismiss notification' });
  }
};
