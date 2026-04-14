const { Server } = require('socket.io');
const { verify } = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../shared/models/user.model');
const AppError = require('../core/appError');
const { HTTP_STATUS_TEXT } = require('../shared/constants/enums');
const logger = require('../core/logger');
const socketEvents = require('./socket.events');
const socketRegistry = require('./socket.registry');
const { initChatNamespace } = require('./namespaces/chat.namespace');
const { initNotificationNamespace } = require('./namespaces/notification.namespace');

let ioInstance = null;
const onlinePresenceCache = new Set();

const extractToken = (socket) => {
  const authToken = socket.handshake?.auth?.token;
  const headerToken = socket.handshake?.headers?.authorization;
  const rawToken = authToken || headerToken;

  if (!rawToken) return null;
  if (rawToken.startsWith('Bearer ')) {
    return rawToken.split(' ')[1];
  }

  return rawToken;
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = extractToken(socket);
    if (!token)  return next(new AppError(401, HTTP_STATUS_TEXT.UNAUTHORIZED, 'Unauthorized: token missing'));

    const decoded = verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id).select('refreshTokens role');

    if (!user) return next(new AppError(401, HTTP_STATUS_TEXT.UNAUTHORIZED, 'Unauthorized: user not found'));

    const sessionExists = user.refreshTokens.id(decoded.sessionId);
    if (!sessionExists) return next(new AppError(401, HTTP_STATUS_TEXT.UNAUTHORIZED, 'Unauthorized: session revoked'));

    socket.userId = decoded.id.toString();
    socket.user = {
      id: decoded.id.toString(),
      role: decoded.role,
      email: decoded.email,
    };

    return next();
  } catch (error) {
    next(new AppError(401, HTTP_STATUS_TEXT.UNAUTHORIZED, 'Unauthorized: invalid token'));
  }
};

const updatePresenceState = (userId, status) => {
  const normalizedUserId = userId.toString();
  const isOnline = onlinePresenceCache.has(normalizedUserId);

  if (status === 'online' && isOnline) return null;
  if (status === 'offline' && !isOnline) return null;

  if (status === 'online') {
    onlinePresenceCache.add(normalizedUserId);
  } else {
    onlinePresenceCache.delete(normalizedUserId);
  }

  return {
    userId: normalizedUserId,
    status,
    changedAt: new Date().toISOString(),
  };
};

const broadcastPresence = (io, payload) => {
  if (!payload) return;

  io.emit(socketEvents.USER_PRESENCE_CHANGED, payload);
};

const emitPresence = (io, userId, status) => {
  const payload = updatePresenceState(userId, status);
  broadcastPresence(io, payload);
};

const emitOnlineUsersSnapshot = (socket) => {
  socket.emit(socketEvents.ONLINE_USERS_SNAPSHOT, {
    onlineUsers: Array.from(onlinePresenceCache),
    generatedAt: new Date().toISOString(),
  });
};

const onSocketConnected = (socket) => {
  const userId = socket.userId.toString();
  const wasOnline = socketRegistry.isOnline(userId);

  socketRegistry.register(userId, socket.id);
  if (!wasOnline) {
    emitPresence(ioInstance, userId, 'online');
  }

  socket.on(socketEvents.GET_ONLINE_USERS, () => {
    emitOnlineUsersSnapshot(socket);
  });

  socket.on('disconnect', () => {
    socketRegistry.unregister(userId, socket.id);

    setTimeout(() => {
      if (!socketRegistry.isOnline(userId)) {
        emitPresence(ioInstance, userId, 'offline');
      }
    }, 50);
  });
};

const initializeSocket = (httpServer) => {
  if (ioInstance) return ioInstance;

  ioInstance = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  const namespaces = [
    ioInstance.of('/'),
    ioInstance.of('/chat'),
    ioInstance.of('/notifications'),
  ];

  namespaces.forEach((namespace) => {
    namespace.use(authenticateSocket);
    namespace.on('connection', onSocketConnected);
  });

  initChatNamespace(ioInstance);
  initNotificationNamespace(ioInstance);

  logger.info('Socket.IO initialized successfully');

  return ioInstance;
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO has not been initialized');
  }
  return ioInstance;
};

module.exports = {
  initializeSocket,
  getIO,
};
