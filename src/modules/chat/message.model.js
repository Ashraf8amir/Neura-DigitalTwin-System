const mongoose = require('mongoose');
const chatConstants = require('./chat.constant');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      trim: true,
    },
    messageType: {
      type: String,
      enum: Object.values(chatConstants.MESSAGE_TYPES),
      default: chatConstants.MESSAGE_TYPES.TEXT,
    },
    attachment: {
      url: String,
      publicId: String,
      fileName: String,
      fileSize: Number,
      mimeType: String,
      _id: false,
    },
    status: {
      type: String,
      enum: Object.values(chatConstants.MESSAGE_STATUSES),
      default: chatConstants.MESSAGE_STATUSES.SENT,
      index: true,
    },
    readAt: Date,
    deliveredAt: Date,
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ content: 'text' });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;

