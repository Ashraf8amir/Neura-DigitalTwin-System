const AppError = require('../../core/appError');
const { HTTP_STATUS_TEXT } = require('../../shared/constants/enums');

const validateParticipant = (conversation, userId) => {
  if (!conversation) {
    throw new AppError(404, HTTP_STATUS_TEXT.NOT_FOUND, 'Conversation not found');
  }

  const normalizedUserId = userId.toString();
  const doctorId = conversation.doctorId?.toString();
  const patientId = conversation.patientId?.toString();
  const isParticipant = doctorId === normalizedUserId || patientId === normalizedUserId;

  if (!isParticipant) {
    throw new AppError(403, HTTP_STATUS_TEXT.FORBIDDEN, 'You are not part of this conversation');
  }
};

const getOtherParticipant = (conversation, userId) => {
  validateParticipant(conversation, userId);

  const normalizedUserId = userId.toString();
  const doctorId = conversation.doctorId?.toString();
  const patientId = conversation.patientId?.toString();

  return doctorId === normalizedUserId ? patientId : doctorId;
};

const getConversationRoom = (conversationId) => `conversation:${conversationId}`;

module.exports = {
  validateParticipant,
  getOtherParticipant,
  getConversationRoom,
};

