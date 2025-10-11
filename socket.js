require('dotenv').config();
const jwt = require('jsonwebtoken');

let io;
const onlineUsers = new Map();

module.exports = {
  init: server => {
    const { Server } = require('socket.io');
    io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
      transports: ['websocket'],
    });

    io.on('connection', socket => {
      console.log('Socket connected:', socket.id);

      const { token } = socket.handshake.auth;
      const userId = getUserIdFromToken(token);
      if (!userId) return socket.disconnect();

      // Track online user
      if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
      onlineUsers.get(userId).add(socket.id);

      socket.join(userId); // join room anyway for fallback

      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        const sockets = onlineUsers.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) onlineUsers.delete(userId);
        }
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) throw new Error('Socket.io not initialized!');
    return io;
  },

  getOnlineUsers: () => onlineUsers,
};

function getUserIdFromToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    return decoded.id;
  } catch (err) {
    return null;
  }
}
