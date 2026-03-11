const AppError = require('../../core/appError');
const { HTTP_STATUS_TEXT } = require('../constants/enums');

const parseJsonBodyFields = (fields = []) => {
    return (req, res, next) => {
        try {
            if (!req.body || typeof req.body !== 'object') {
                return next();
            }

            fields.forEach((field) => {
                const rawValue = req.body[field];

                if (typeof rawValue === 'string') {
                    req.body[field] = rawValue.trim() ? JSON.parse(rawValue) : {};
                }
            });

            next();
        } catch (error) {
            return next(new AppError(400, HTTP_STATUS_TEXT.BAD_REQUEST, 'Invalid JSON format in request body'));
        }
    };
};

module.exports = parseJsonBodyFields;
