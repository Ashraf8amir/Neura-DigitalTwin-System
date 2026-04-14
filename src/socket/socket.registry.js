const onlineUserSockets = new Map();

const normalizeUserId = (userId) => {
  if (!userId) return null;
  return String(userId);
};

const register = (userId, socketId) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId || !socketId) return;

  if (!onlineUserSockets.has(normalizedUserId)) {
    onlineUserSockets.set(normalizedUserId, new Set());
  }

  onlineUserSockets.get(normalizedUserId).add(socketId);
};

const unregister = (userId, socketId) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId || !socketId) return;

  const sockets = onlineUserSockets.get(normalizedUserId);
  if (!sockets) return;

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUserSockets.delete(normalizedUserId);
  }
};

const isOnline = (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return false;

  const sockets = onlineUserSockets.get(normalizedUserId);
  return Boolean(sockets && sockets.size > 0);
};

const getSocketIds = (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return [];

  const sockets = onlineUserSockets.get(normalizedUserId);
  return sockets ? Array.from(sockets) : [];
};

const getAllOnlineUsers = () =>
  Array.from(onlineUserSockets.entries()).map(([userId, sockets]) => ({
    userId,
    socketCount: sockets.size,
  }));

module.exports = {
  register,
  unregister,
  isOnline,
  getSocketIds,
  getAllOnlineUsers,
};