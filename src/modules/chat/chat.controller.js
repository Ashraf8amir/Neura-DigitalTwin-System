const asyncWrapper = require('../../shared/middlewares/asyncWrapper.middleware');
const { HTTP_STATUS_TEXT } = require('../../shared/constants/enums');
const ApiResponse = require('../../core/apiResponse');
const chatService = require('./chat.service');

/**
 * @desc    Create a new conversation or retrieve existing one between two users
 * @route   POST /api/chat/conversations
 * @access  Private (Doctor and Patient)
 */
exports.createConversation = asyncWrapper(async (req, res) => {
  const result = await chatService.createOrGetConversation(req.user, req.body.otherUserId);

  return new ApiResponse(
    res,
    result.isNew ? 201 : 200,
    result.isNew ? HTTP_STATUS_TEXT.CREATED : HTTP_STATUS_TEXT.SUCCESS,
    result.isNew ? 'Conversation created successfully' : 'Conversation retrieved successfully',
    result
  );
});

/**
 * @desc    Get all conversations for the authenticated user
 * @route   GET /api/chat/conversations
 * @access  Private (Doctor and Patient)
 */
exports.getConversations = asyncWrapper(async (req, res) => {
  const conversations = await chatService.getConversations(req.user);

  return new ApiResponse(
    res,
    200,
    HTTP_STATUS_TEXT.SUCCESS,
    'Conversations retrieved successfully',
    conversations
  );
});

/**
 * @desc    Get messages for a specific conversation with pagination
 * @route   GET /api/chat/conversations/:conversationId/messages
 * @access  Private (Doctor and Patient)
 * @query   ?page=1&limit=20
 */
exports.getMessages = asyncWrapper(async (req, res) => {
  const io = req.app.get('io');
  const result = await chatService.getConversationMessages(
    req.user,
    req.params.conversationId,
    req.query,
    io
  );

  return new ApiResponse(res, 200, HTTP_STATUS_TEXT.SUCCESS, 'Messages retrieved successfully', result.data, result.pagination);
});

/**
 * @desc    Send a text message in a conversation
 * @route   POST /api/chat/conversations/:conversationId/messages
 * @access  Private (Doctor and Patient)
 */
exports.sendMessage = asyncWrapper(async (req, res) => {
  const io = req.app.get('io');
  const message = await chatService.sendTextMessage(
    req.user,
    req.params.conversationId,
    req.body.content,
    io
  );

  return new ApiResponse(res, 201, HTTP_STATUS_TEXT.CREATED, 'Message sent successfully', message);
});

/**
 * @desc    Send an attachment (image or PDF) in a conversation
 * @route   POST /api/chat/conversations/:conversationId/attachments
 * @access  Private (Doctor and Patient)
 */
exports.sendAttachment = asyncWrapper(async (req, res) => {
  const io = req.app.get('io');
  const message = await chatService.sendAttachmentMessage(
    req.user,
    req.params.conversationId,
    req.file,
    req.body.content,
    io
  );

  return new ApiResponse(res, 201, HTTP_STATUS_TEXT.CREATED, 'Attachment sent successfully', message);
});

/**
 * @desc    Search messages across all conversations of the authenticated user
 * @route   GET /api/chat/conversations/search?q=keyword
 * @access  Private (Doctor and Patient)
 */
exports.searchMessages = asyncWrapper(async (req, res) => {
  const result = await chatService.searchMessages(req.user, req.query.q, req.query);

  return new ApiResponse(
    res,
    200,
    HTTP_STATUS_TEXT.SUCCESS,
    'Message search completed successfully',
    result.data,
    result.pagination
  );
});

/**
 * @desc    Mark a message as read
 * @route   PATCH /api/chat/messages/:messageId/read
 * @access  Private (Doctor and Patient)
 */
exports.markMessageRead = asyncWrapper(async (req, res) => {
  const io = req.app.get('io');
  const message = await chatService.markMessageAsRead(req.user, req.params.messageId, io);

  return new ApiResponse(res, 200, HTTP_STATUS_TEXT.SUCCESS, 'Message marked as read', message);
});

