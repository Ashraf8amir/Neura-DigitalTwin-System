const Joi = require('joi');
const chatConstants = require('./chat.constant');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const createConversationSchema = Joi.object({
  body: Joi.object({
    otherUserId: Joi.string().pattern(objectIdPattern).required().messages({
      'any.required': 'otherUserId is required',
      'string.pattern.base': 'otherUserId must be a valid 24-character hex string',
    }),
  }),
});

const getMessagesSchema = Joi.object({
  params: Joi.object({
    conversationId: Joi.string().pattern(objectIdPattern).required().messages({
      'any.required': 'conversationId is required',
      'string.pattern.base': 'conversationId must be a valid 24-character hex string',
    }),
  }),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(chatConstants.DEFAULT_PAGE),
    limit: Joi.number().integer().min(1).max(chatConstants.MAX_LIMIT).default(chatConstants.DEFAULT_LIMIT),
  }),
});

const sendMessageSchema = Joi.object({
  params: Joi.object({
    conversationId: Joi.string().pattern(objectIdPattern).required().messages({
      'any.required': 'conversationId is required',
      'string.pattern.base': 'conversationId must be a valid 24-character hex string',
    }),
  }),
  body: Joi.object({
    content: Joi.string().trim().min(1).max(4000).required().messages({
      'any.required': 'content is required',
      'string.empty': 'content cannot be empty',
      'string.min': 'content cannot be empty',
      'string.max': 'content cannot exceed 4000 characters',
    }),
  }),
});

const sendAttachmentSchema = Joi.object({
  params: Joi.object({
    conversationId: Joi.string().pattern(objectIdPattern).required().messages({
      'any.required': 'conversationId is required',
      'string.pattern.base': 'conversationId must be a valid 24-character hex string',
    }),
  }),
  body: Joi.object({
    content: Joi.string().trim().allow('').max(4000).optional(),
  }),
});

const searchMessagesSchema = Joi.object({
  query: Joi.object({
    q: Joi.string().trim().min(chatConstants.MIN_SEARCH_LENGTH).required().messages({
      'any.required': 'q is required',
      'string.empty': 'q is required',
      'string.min': `q must be at least ${chatConstants.MIN_SEARCH_LENGTH} characters`,
    }),
    page: Joi.number().integer().min(1).default(chatConstants.DEFAULT_PAGE),
    limit: Joi.number().integer().min(1).max(chatConstants.MAX_LIMIT).default(chatConstants.SEARCH_DEFAULT_LIMIT),
  }),
});

const markReadSchema = Joi.object({
  params: Joi.object({
    messageId: Joi.string().pattern(objectIdPattern).required().messages({
      'any.required': 'messageId is required',
      'string.pattern.base': 'messageId must be a valid 24-character hex string',
    }),
  }),
});

module.exports = {
  createConversationSchema,
  getMessagesSchema,
  sendMessageSchema,
  sendAttachmentSchema,
  searchMessagesSchema,
  markReadSchema,
};

