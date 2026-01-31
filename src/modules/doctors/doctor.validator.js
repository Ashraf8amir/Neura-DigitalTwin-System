const joi = require("joi");
const constants = require("../../shared/constants/enums");

exports.updateBasicInfoSchema = (data) => {
    const updateBasicInfoSchema = joi.object({
        firstName: joi.string().trim().min(2).max(30)
            .pattern(/^[\u0600-\u06FFa-zA-Z\s]+$/)
            .optional()
            .messages({
                'string.pattern.base': 'First name must contain only Arabic or English letters'
            }),
        lastName: joi.string().trim().min(2).max(30)
            .pattern(/^[\u0600-\u06FFa-zA-Z\s]+$/)
            .optional()
            .messages({
                'string.pattern.base': 'Last name must contain only Arabic or English letters'
            }),
        dateOfBirth: joi.date().max('now').optional().messages({
            'date.max': 'Date of birth cannot be in the future'
        }),
        gender: joi.string().valid('male', 'female').optional().messages({
            'any.only': 'Gender must be either male or female'
        }),
        phone: joi.string().pattern(/^01[0-2,5]{1}[0-9]{8}$/).allow('', null).optional()
            .messages({ 'string.pattern.base': 'Phone number must be between 10 to 15 digits' }),
        nationality: joi.string().trim().min(2).max(50).valid('Egyptian', 'other').allow('', null).optional(),
        address: joi.object({
            governorate: joi.string().trim().allow('', null).optional()
                .messages({ 'string.empty': 'Governorate cannot be empty' }),
            city: joi.string().trim().allow('', null).optional()
                .messages({ 'string.empty': 'City cannot be empty' }),
            street: joi.string().trim().allow('', null).optional()
                .messages({ 'string.empty': 'Street cannot be empty' }),
        }).optional()

    }).min(1).messages({'object.min': 'At least one field must be provided for update'})

    return updateBasicInfoSchema.validate(data, { abortEarly: false });
}
exports.updateProfessionalInfoSchema = (data) => {
    const updateProfessionalInfoSchema = joi.object({
        primarySpecialization: joi.string().trim().min(2).max(100).optional(),
        subSpecializations: joi.array().items(
            joi.string().trim().min(2).max(100)
        ).optional(),
        highestDegree: joi.string().trim().min(2).max(100).optional(),
        medicalSchool: joi.string().trim().min(2).max(100).optional(),
        yearsOfExperience: joi.number().integer().min(0).max(100).optional(),
        currentPosition: joi.string().trim().min(2).max(100).optional(),
        hospitalAffiliation: joi.array().items(
            joi.string().trim().min(2).max(100)
        ).optional(),
        bio: joi.string().trim().max(1000).optional()
    }).min(1).messages({'object.min': 'At least one field must be provided for update'})

    return updateProfessionalInfoSchema.validate(data, { abortEarly: false });
}
exports.addCertificateSchema = (data) => {
    const addCertificateSchema = joi.object({
        name: joi.string().trim().min(2).max(200).required(),
        institution: joi.string().trim().min(2).max(200).required(),
        Year: joi.number().integer().min(1900).max(new Date().getFullYear()).required()
    });

    return addCertificateSchema.validate(data, { abortEarly: false });
}
exports.addMembershipSchema = (data) => {
    const addMembershipSchema = joi.object({
        nameOfAssociation: joi.string().trim().min(2).max(200).required(),
        memberId: joi.string().trim().min(1).max(100).allow('', null).optional(),
        Since: joi.number().integer().min(1900).max(new Date().getFullYear()).allow(null).optional()
    }); 

    return addMembershipSchema.validate(data, { abortEarly: false });
}
exports.addAwardSchema = (data) => {
    const addAwardSchema = joi.object({
        name: joi.string().trim().min(2).max(200).required(),
        awardedBy: joi.string().trim().min(2).max(200).required(),
        year: joi.number().integer().min(1900).max(new Date().getFullYear()).required()
    });

    return addAwardSchema.validate(data, { abortEarly: false });
}

exports.setClinicInfoSchema = (data) => {
    const setClinicInfoSchema = joi.object({
        clinicName: joi.string().trim().min(2).max(200).required(),
        phone: joi.string().pattern(/^01[0-2,5]{1}[0-9]{8}$/).required()
            .messages({ 'string.pattern.base': 'Phone number must be a valid Egyptian phone number' }),
        isPrimary: joi.boolean().optional(),
        address: joi.object({
            governorate: joi.string().trim().min(2).max(100).required(),
            city: joi.string().trim().min(2).max(100).required(),
            street: joi.string().trim().min(2).max(200).required(),
            buildingNumber: joi.string().trim().min(1).max(50).optional(),
            floor: joi.string().trim().min(1).max(50).optional(),
            landmark: joi.string().trim().min(2).max(200).optional()
        }).required(),
        location: joi.object({
            type: joi.string().valid('Point').required(),
            coordinates: joi.array().items(
                joi.number().required()
            ).length(2).required()
        }).optional(),
        availableHours: joi.array().items(
            joi.object({
                day: joi.string().valid(...Object.values(constants.DAYS_OF_WEEK)).required(),
                startTime: joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/).required()
                    .messages({ 'string.pattern.base': 'Start time must be in HH:mm format' }),
                endTime: joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/).required()
                    .messages({ 'string.pattern.base': 'End time must be in HH:mm format' }),
            }).required()
        ).required(),
        consultationFee: joi.number().min(0).max(10000).required(),
        followUpFee: joi.number().min(0).max(10000).required()
    });

    return setClinicInfoSchema.validate(data, { abortEarly: false });
}
exports.updateClinicInfoSchema = (data) => {
    const updateClinicInfoSchema = joi.object({
        clinicName: joi.string().trim().min(2).max(200).optional(),
        phone: joi.string().pattern(/^01[0-2,5]{1}[0-9]{8}$/).optional()
            .messages({ 'string.pattern.base': 'Phone number must be a valid Egyptian phone number' }),
        isPrimary: joi.boolean().optional(),
        address: joi.object({
            governorate: joi.string().trim().min(2).max(100).optional(),
            city: joi.string().trim().min(2).max(100).optional(),
            street: joi.string().trim().min(2).max(200).optional(),
            buildingNumber: joi.string().trim().min(1).max(50).optional(),
            floor: joi.string().trim().min(1).max(50).optional(),
            landmark: joi.string().trim().min(2).max(200).optional()
        }).optional(),
        location: joi.object({
            type: joi.string().valid('Point').required(),
            coordinates: joi.array().items(
                joi.number().required()
            ).length(2).required()
        }).optional(),
        availableHours: joi.array().items(
            joi.object({
                day: joi.string().valid(...Object.values(constants.DAYS_OF_WEEK)).required(),
                startTime: joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/).required()
                    .messages({ 'string.pattern.base': 'Start time must be in HH:mm format' }),
                endTime: joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/).required()
                    .messages({ 'string.pattern.base': 'End time must be in HH:mm format' }),
            }).required()
        ).optional(),
        consultationFee: joi.number().min(0).max(10000).optional(),
        followUpFee: joi.number().min(0).max(10000).optional()
    }).min(1).messages({'object.min': 'At least one field must be provided for update'})

    return updateClinicInfoSchema.validate(data, { abortEarly: false });
}