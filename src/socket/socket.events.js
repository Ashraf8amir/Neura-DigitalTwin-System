module.exports = {
  GET_ONLINE_USERS: 'presence:get_online_users',
  ONLINE_USERS_SNAPSHOT: 'presence:online_users_snapshot',
  USER_PRESENCE_CHANGED: 'user:presence_changed',

  // chat
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
  CHAT_MESSAGE: 'chat:message',
  CHAT_DELIVERED: 'chat:delivered',
  CHAT_READ: 'chat:read',
  CHAT_TYPING: 'chat:typing',
  CHAT_STOP_TYPING: 'chat:stop_typing',

  // notifications
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
};
