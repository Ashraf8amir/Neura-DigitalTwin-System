const Appointment = require('../appointments/appointment.model');
const { appointmentConstants } = require('../appointments/appointment.constant');
const User = require('../../shared/models/user.model');
const Conversation = require('./conversation.model');
const Message = require('./message.model');
const chatConstants = require('./chat.constant');
const chatHelpers = require('./chat.helper');
const cloudinaryService = require('../../config/cloudinary');
const AppError = require('../../core/appError');
const { HTTP_STATUS_TEXT, ROLE } = require('../../shared/constants/enums');
const { getPagination } = require('../../shared/utils/globalHelper');
const socketEvents = require('../../socket/socket.events');
const socketRegistry = require('../../socket/socket.registry');

class ChatService {
  messageStatuses = chatConstants.MESSAGE_STATUSES;

  messageTypes = chatConstants.MESSAGE_TYPES;

  async createOrGetConversation(authUser, otherUserId) {
    if (authUser.id.toString() === otherUserId.toString()) {
      throw new AppError(400, HTTP_STATUS_TEXT.BAD_REQUEST, 'You cannot start a conversation with yourself');
    }

    const otherUser = await User.findById(otherUserId).select('firstName lastName role profileImage');
    if (!otherUser) {
      throw new AppError(404, HTTP_STATUS_TEXT.NOT_FOUND, 'User not found');
    }

    const isValidDoctorPatientPair =
      (authUser.role === ROLE.DOCTOR && otherUser.role === ROLE.PATIENT) ||
      (authUser.role === ROLE.PATIENT && otherUser.role === ROLE.DOCTOR);

    if (!isValidDoctorPatientPair) {
      throw new AppError(403, HTTP_STATUS_TEXT.FORBIDDEN, 'Conversations are allowed only between doctor and patient');
    }

    const doctorId = authUser.role === ROLE.DOCTOR ? authUser.id : otherUserId;
    const patientId = authUser.role === ROLE.PATIENT ? authUser.id : otherUserId;

    const hasValidAppointment = await Appointment.exists({
      doctor: doctorId,
      patient: patientId,
      status: { $ne: appointmentConstants.APPOINTMENT_STATUSES.CANCELLED },
    });

    if (!hasValidAppointment) {
      throw new AppError( 403, HTTP_STATUS_TEXT.FORBIDDEN, 'Conversation can only start if both users have at least one non-cancelled appointment');
    }

    let conversation = await Conversation.findOneAndUpdate(
      { doctorId, patientId }, 
      { $setOnInsert: { doctorId, patientId } }, 
      { 
        new: true,             
        upsert: true            
      }
    ).populate([
      { path: 'doctorId', select: 'firstName lastName role profileImage' },
      { path: 'patientId', select: 'firstName lastName role profileImage' },
    ]);

    return {
      isNew: conversation.createdAt.getTime() === conversation.updatedAt.getTime(),
      conversation: this.formatConversation(conversation, authUser.id),
    };
  }

  async getConversations(authUser) {
    const userId = authUser.id.toString();
    const query = authUser.role === ROLE.DOCTOR ? { doctorId: userId } : { patientId: userId };

    const conversations = await Conversation.find(query)
      .sort({ 'lastMessage.sentAt': -1, updatedAt: -1 })
      .populate([
        { path: 'doctorId', select: 'firstName lastName role profileImage' },
        { path: 'patientId', select: 'firstName lastName role profileImage' },
      ])
      .lean();

    return conversations.map((conversation) => this.formatConversation(conversation, userId));
  }

  async getConversationMessages(authUser, conversationId, options = {}, io) {
    const userId = authUser.id.toString();
    const page = Number(options.page) || chatConstants.DEFAULT_PAGE;
    const limit = Number(options.limit) || chatConstants.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findById(conversationId).select('doctorId patientId');
    chatHelpers.validateParticipant(conversation, userId);

    const unreadMessages = await Message.find({
      conversationId,
      receiverId: userId,
      status: this.messageStatuses.SENT,
    }).select('_id').lean();

    if (unreadMessages.length) {
      const deliveredAt = new Date();
      const unreadMessageIds = unreadMessages.map((message) => message._id);

      await Message.updateMany(
        { _id: { $in: unreadMessageIds } },
        {
          $set: {
            status: this.messageStatuses.DELIVERED,
            deliveredAt,
          },
        }
      );

      const senderId = chatHelpers.getOtherParticipant(conversation, userId);
      unreadMessages.forEach((message) => {
        this.emitToUser(io, senderId, socketEvents.CHAT_DELIVERED, {
          messageId: message._id.toString(),
          deliveredAt,
        });
      });
    }

    const [messages, total] = await Promise.all([
      Message.find({ conversationId }).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
      Message.countDocuments({ conversationId }),
    ]);

    return {
      data: messages.map((message) => this.formatMessage(message)),
      pagination: getPagination(total, page, limit),
    };
  }

  async sendTextMessage(authUser, conversationId, content, io) {
    const conversation = await Conversation.findById(conversationId).select('doctorId patientId');
    chatHelpers.validateParticipant(conversation, authUser.id);

    const senderId = authUser.id.toString();
    const receiverId = chatHelpers.getOtherParticipant(conversation, senderId);

    return this.createAndDispatchMessage({
      io,
      conversation,
      senderId,
      receiverId,
      content,
      messageType: this.messageTypes.TEXT,
    });
  }

  async sendAttachmentMessage(authUser, conversationId, file, content, io) {
    if (!file) {
      throw new AppError(400, HTTP_STATUS_TEXT.BAD_REQUEST, 'Attachment file is required');
    }

    const supportedImageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const isImage = file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';

    if ((isImage && !supportedImageMimeTypes.includes(file.mimetype)) || (!isImage && !isPdf)) {
      throw new AppError(400, HTTP_STATUS_TEXT.BAD_REQUEST, 'Only JPG, PNG images and PDF files are supported');
    }

    const conversation = await Conversation.findById(conversationId).select('doctorId patientId');
    chatHelpers.validateParticipant(conversation, authUser.id);

    const uploadResult = await cloudinaryService.uploadDocumentToCloudinary(
      file.buffer,
      file.originalname,
      file.mimetype,
      {
        folder: `chat/${conversationId}`,
        publicId: `chat-${conversationId}-${Date.now()}`,
      }
    );

    const senderId = authUser.id.toString();
    const receiverId = chatHelpers.getOtherParticipant(conversation, senderId);
    const messageType = isImage ? this.messageTypes.IMAGE : this.messageTypes.FILE;
    const normalizedContent = (content || '').trim();

    return this.createAndDispatchMessage({
      io,
      conversation,
      senderId,
      receiverId,
      content: normalizedContent || file.originalname,
      messageType,
      attachment: {
        url: uploadResult.url,
        publicId: uploadResult.cloudinaryId,
        fileName: uploadResult.filename,
        fileSize: uploadResult.size,
        mimeType: file.mimetype,
      },
    });
  }

  async searchMessages(authUser, queryText, options = {}) {
    const userId = authUser.id.toString();
    const page = Number(options.page) || chatConstants.DEFAULT_PAGE;
    const limit = Number(options.limit) || chatConstants.SEARCH_DEFAULT_LIMIT;
    const skip = (page - 1) * limit;
    const normalizedQuery = queryText.trim();

    const conversationFilter = authUser.role === ROLE.DOCTOR ? { doctorId: userId } : { patientId: userId };
    const userConversations = await Conversation.find(conversationFilter).select('_id').lean();
    const conversationIds = userConversations.map((conversation) => conversation._id);

    if (!conversationIds.length) {
      return {
        data: [],
        pagination: getPagination(0, page, limit),
      };
    }

    const searchFilter = {
      conversationId: { $in: conversationIds },
      $text: { $search: normalizedQuery },
    };

    const [messages, total] = await Promise.all([
      Message.find(searchFilter)
        .select({
          score: { $meta: 'textScore' },
          conversationId: 1,
          senderId: 1,
          receiverId: 1,
          content: 1,
          messageType: 1,
          attachment: 1,
          status: 1,
          readAt: 1,
          deliveredAt: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments(searchFilter),
    ]);

    const scopedConversationIds = [...new Set(messages.map((message) => message.conversationId.toString()))];
    const contexts = await Conversation.find({ _id: { $in: scopedConversationIds } })
      .populate([
        { path: 'doctorId', select: 'firstName lastName role profileImage' },
        { path: 'patientId', select: 'firstName lastName role profileImage' },
      ])
      .lean();

    const conversationMap = new Map(contexts.map((context) => [context._id.toString(), context]));

    return {
      data: messages.map((message) => ({
        ...this.formatMessage(message),
        conversation: this.formatConversation(conversationMap.get(message.conversationId.toString()), userId),
      })),
      pagination: getPagination(total, page, limit),
    };
  }

  async markMessageAsRead(authUser, messageId, io) {
    const userId = authUser.id.toString();
    const message = await Message.findById(messageId);

    if (!message) {
      throw new AppError(404, HTTP_STATUS_TEXT.NOT_FOUND, 'Message not found');
    }

    if (message.receiverId.toString() !== userId) {
      throw new AppError(403, HTTP_STATUS_TEXT.FORBIDDEN, 'Only receiver can mark this message as read');
    }

    if (message.status !== this.messageStatuses.READ) {
      message.status = this.messageStatuses.READ;
      message.readAt = new Date();
      await message.save();
    }

    const payload = {
      messageId: message._id.toString(),
      readAt: message.readAt,
    };

    this.emitToUser(io, message.senderId.toString(), socketEvents.CHAT_READ, payload);
    this.emitToRoom(io, message.conversationId.toString(), socketEvents.CHAT_READ, payload);

    return this.formatMessage(message);
  }

  async createAndDispatchMessage({ io, conversation, senderId, receiverId, content, messageType, attachment = null }) {
    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      receiverId,
      content,
      messageType,
      attachment,
      status: this.messageStatuses.SENT,
    });

    if (socketRegistry.isOnline(receiverId)) {
      message.status = this.messageStatuses.DELIVERED;
      message.deliveredAt = new Date();
      await message.save();
    }

    conversation.lastMessage = {
      content,
      sentAt: message.createdAt,
      senderId,
      messageType,
    };
    await conversation.save();

    const messagePayload = this.formatMessage(message);

    this.emitToRoom(io, conversation._id.toString(), socketEvents.CHAT_MESSAGE, { message: messagePayload });
    this.emitToUser(io, receiverId, socketEvents.CHAT_MESSAGE, { message: messagePayload });
    this.emitToUser(io, senderId, socketEvents.CHAT_MESSAGE, { message: messagePayload });

    if (message.status === this.messageStatuses.DELIVERED) {
      const deliveredPayload = {
        messageId: message._id.toString(),
        deliveredAt: message.deliveredAt,
      };

      this.emitToRoom(io, conversation._id.toString(), socketEvents.CHAT_DELIVERED, deliveredPayload);
      this.emitToUser(io, senderId, socketEvents.CHAT_DELIVERED, deliveredPayload);
    }

    return messagePayload;
  }

  emitToRoom(io, conversationId, eventName, payload) {
    if (!io) return;
    io.of('/chat').to(chatHelpers.getConversationRoom(conversationId)).emit(eventName, payload);
  }

  emitToUser(io, userId, eventName, payload) {
    if (!io) return;

    const socketIds = socketRegistry.getSocketIds(userId);
    socketIds.forEach((socketId) => {
      io.of('/chat').to(socketId).emit(eventName, payload);
    });
  }

  formatConversation(conversation, currentUserId) {
    if (!conversation) return null;

    const doctor = conversation.doctorId || {};
    const patient = conversation.patientId || {};
    const normalizedCurrentUserId = currentUserId.toString();
    const doctorId = doctor._id ? doctor._id.toString() : doctor.toString();
    const otherParticipant = doctorId === normalizedCurrentUserId ? patient : doctor;

    return {
      id: conversation._id.toString(),
      isActive: conversation.isActive,
      lastMessage: conversation.lastMessage || null,
      otherUser: {
        id: otherParticipant?._id?.toString() || otherParticipant?.toString(),
        firstName: otherParticipant?.firstName || null,
        lastName: otherParticipant?.lastName || null,
        fullName:
          otherParticipant?.firstName && otherParticipant?.lastName
            ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
            : null,
        role: otherParticipant?.role || null,
        profileImage: otherParticipant?.profileImage?.imageUrl || null,
      },
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  formatMessage(message) {
    return {
      id: message._id.toString(),
      conversationId: message.conversationId.toString(),
      senderId: message.senderId.toString(),
      receiverId: message.receiverId.toString(),
      content: message.content,
      messageType: message.messageType,
      attachment: message.attachment || null,
      status: message.status,
      readAt: message.readAt,
      deliveredAt: message.deliveredAt,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}

module.exports = new ChatService();

