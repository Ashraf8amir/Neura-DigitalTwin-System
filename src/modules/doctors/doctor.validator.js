const joi = require("joi");
const enums = require("../../shared/constants/enums");

exports.updateBasicInfoSchema = joi.object({
    body: joi.object({
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
});

exports.updateProfessionalInfoSchema = joi.object({
    body: joi.object({
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
});

exports.addCertificateSchema = joi.object({
    body: joi.object({
        name: joi.string().trim().min(2).max(200).required(),
        institution: joi.string().trim().min(2).max(200).required(),
        Year: joi.number().integer().min(1900).max(new Date().getFullYear()).required()
    })
});

exports.addMembershipSchema = joi.object({
    body: joi.object({
        nameOfAssociation: joi.string().trim().min(2).max(200).required(),
        memberId: joi.string().trim().min(1).max(100).allow('', null).optional(),
        Since: joi.number().integer().min(1900).max(new Date().getFullYear()).allow(null).optional()
    })
});

exports.addAwardSchema = joi.object({
    body: joi.object({
        name: joi.string().trim().min(2).max(200).required(),
        awardedBy: joi.string().trim().min(2).max(200).required(),
        year: joi.number().integer().min(1900).max(new Date().getFullYear()).required()
    })
});

exports.setClinicInfoSchema = joi.object({
    body: joi.object({
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
        consultationDuration: joi.number().integer().min(5).max(240).required(),
        availableHours: joi.array().items(
            joi.object({
                day: joi.string().valid(...Object.values(enums.DAYS_OF_WEEK)).required(),
                startTime: joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/).required()
                    .messages({ 'string.pattern.base': 'Start time must be in HH:mm format' }),
                endTime: joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/).required()
                    .messages({ 'string.pattern.base': 'End time must be in HH:mm format' }),
            }).required()
        ).required(),
        consultationFee: joi.number().min(0).max(10000).required(),
        followUpFee: joi.number().min(0).max(10000).required()
    })
});

exports.updateClinicInfoSchema = joi.object({
    body: joi.object({
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
        consultationDuration: joi.number().integer().min(5).max(240).optional(),
        availableHours: joi.array().items(
            joi.object({
                day: joi.string().valid(...Object.values(enums.DAYS_OF_WEEK)).required(),
                startTime: joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/).required()
                    .messages({ 'string.pattern.base': 'Start time must be in HH:mm format' }),
                endTime: joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/).required()
                    .messages({ 'string.pattern.base': 'End time must be in HH:mm format' }),
            }).required()
        ).optional(),
        consultationFee: joi.number().min(0).max(10000).optional(),
        followUpFee: joi.number().min(0).max(10000).optional()
    }).min(1).messages({'object.min': 'At least one field must be provided for update'})
});

exports.addTelemedicineSchema = joi.object({
    body: joi.object({
        consultationFee: joi.number().min(0).max(10000).required(),
        consultationDuration: joi.number().integer().min(5).max(240).default(30),
        availableHours: joi.array().items(
            joi.object({
                day: joi.string().valid(...Object.values(enums.DAYS_OF_WEEK)).required(),
                startTime: joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/).required()
                    .messages({ 'string.pattern.base': 'Start time must be in HH:mm format' }),
                endTime: joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/).required()
                    .messages({ 'string.pattern.base': 'End time must be in HH:mm format' }),
            }).required()
        ).required()
    })
});

exports.updateTelemedicineSchema = joi.object({
    body: joi.object({
        consultationFee: joi.number().min(0).max(10000).optional(),
        consultationDuration: joi.number().integer().min(5).max(240).optional(),
        availableHours: joi.array().items(
            joi.object({
                day: joi.string().valid(...Object.values(enums.DAYS_OF_WEEK)).required(),
                startTime: joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/).required()
                    .messages({ 'string.pattern.base': 'Start time must be in HH:mm format' }),
                endTime: joi.string().pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/).required()
                    .messages({ 'string.pattern.base': 'End time must be in HH:mm format' }),
            }).required()
        ).optional()
    }).min(1).messages({'object.min': 'At least one field must be provided for update'})
});

exports.uploadMedicalLicenseSchema = joi.object({
    body: joi.object({
        licenseNumber: joi.string().trim().min(1).max(100).required(),
        issueDate: joi.date().max('now').required().messages({
            'date.max': 'Issue date cannot be in the future'
        }),
        expiryDate: joi.date().greater(joi.ref('issueDate')).required().messages({
            'date.greater': 'Expiry date must be after issue date'
        })
    })
});

exports.uploadMedicalDegreeSchema = joi.object({
    body: joi.object({
        university: joi.string().trim().min(2).max(100).required(),
        graduationYear: joi.number().integer().min(1900).max(new Date().getFullYear()).required(),
        degree: joi.string().trim().min(2).max(100).required()
    })
});

exports.uploadSyndicateCardSchema = joi.object({
    body: joi.object({
        syndicateNumber: joi.string().trim().min(1).max(100).required(),
        issueDate: joi.date().max('now').required().messages({
            'date.max': 'Issue date cannot be in the future'
        })
    })
});

exports.browseDoctorsSchema = joi.object({
    query: joi.object({
        page: joi.number().integer().min(1).default(1),
        limit: joi.number().integer().min(1).max(100).default(10),
        sortBy: joi.string().valid('rating', 'price').default('rating'),
        sortOrder: joi.string().valid('asc', 'desc').default('desc'),
        specialization: joi.string().trim(),
        city: joi.string().trim(),
        governorate: joi.string().trim(),
        gender: joi.string().valid('male', 'female'),
        minRating: joi.number().min(0).max(5),
        availableToday: joi.boolean()
    })
});
