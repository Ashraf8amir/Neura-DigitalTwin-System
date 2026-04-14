const Conversation = require('../../modules/chat/conversation.model');
const logger = require('../../core/logger');
const socketEvents = require('../socket.events');
const socketRegistry = require('../socket.registry');
const { validateParticipant, getConversationRoom } = require('../../modules/chat/chat.helper');

const resolveConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId).select('doctorId patientId');
  validateParticipant(conversation, userId);
  return conversation;
};

const handleJoin = async (socket, payload = {}) => {
  try {
    const { conversationId } = payload;
    if (!conversationId) return;

    await resolveConversation(conversationId, socket.userId);
    socket.join(getConversationRoom(conversationId));
  } catch (error) {
    logger.warn('Chat join rejected', {
      userId: socket.userId,
      conversationId: payload?.conversationId,
      message: error.message,
    });
  }
};

const handleLeave = async (socket, payload = {}) => {
  try {
    const { conversationId } = payload;
    if (!conversationId) return;

    await resolveConversation(conversationId, socket.userId);
    socket.leave(getConversationRoom(conversationId));
  } catch (error) {
    logger.warn('Chat leave rejected', {
      userId: socket.userId,
      conversationId: payload?.conversationId,
      message: error.message,
    });
  }
};

const handleTyping = async (socket, payload = {}) => {
  try {
    const { conversationId } = payload;
    if (!conversationId) return;
    if (!socketRegistry.isOnline(socket.userId)) return;

    await resolveConversation(conversationId, socket.userId);
    socket
      .to(getConversationRoom(conversationId))
      .emit(socketEvents.CHAT_TYPING, { conversationId, userId: socket.userId });
  } catch (error) {
    logger.warn('Chat typing rejected', {
      userId: socket.userId,
      conversationId: payload?.conversationId,
      message: error.message,
    });
  }
};

const handleStopTyping = async (socket, payload = {}) => {
  try {
    const { conversationId } = payload;
    if (!conversationId) return;
    if (!socketRegistry.isOnline(socket.userId)) return;

    await resolveConversation(conversationId, socket.userId);
    socket
      .to(getConversationRoom(conversationId))
      .emit(socketEvents.CHAT_STOP_TYPING, { conversationId, userId: socket.userId });
  } catch (error) {
    logger.warn('Chat stop_typing rejected', {
      userId: socket.userId,
      conversationId: payload?.conversationId,
      message: error.message,
    });
  }
};

const initChatNamespace = (io) => {
  const chatNamespace = io.of('/chat');

  chatNamespace.on('connection', (socket) => {
    socket.on(socketEvents.CHAT_JOIN, (payload) => handleJoin(socket, payload));
    socket.on(socketEvents.CHAT_LEAVE, (payload) => handleLeave(socket, payload));
    socket.on(socketEvents.CHAT_TYPING, (payload) => handleTyping(socket, payload));
    socket.on(socketEvents.CHAT_STOP_TYPING, (payload) => handleStopTyping(socket, payload));
  });
};

module.exports = {
  initChatNamespace,
};