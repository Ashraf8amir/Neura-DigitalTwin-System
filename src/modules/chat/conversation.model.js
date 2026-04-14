const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lastMessage: {
      content: String,
      sentAt: Date,
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      messageType: String,
      _id: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ doctorId: 1, patientId: 1 }, { unique: true });
conversationSchema.index({ 'lastMessage.sentAt': -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;

