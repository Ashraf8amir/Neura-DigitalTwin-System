const joi = require('joi');


exports.createAppointmentSchema = (data) => {
    const createAppointmentSchema = joi.object({
        patientId: joi.string()
            .length(24)
            .hex()
            .optional()
            .messages({
                'string.length': 'patientId must be a valid 24-character id',
                'string.hex': 'patientId must be a valid ObjectId'
            }),
        doctorId: joi.string()
            .length(24)
            .hex()
            .required()
            .messages({
                'string.length': 'doctorId must be a valid 24-character id',
                'string.hex': 'doctorId must be a valid ObjectId',
                'any.required': 'doctorId is required'
            }),
        appointmentType: joi.string()
            .valid('in-person', 'telemedicine', 'follow-up', 'emergency', 'consultation')
            .default('in-person')
            .messages({
                'any.only': 'Invalid appointment type'
        }),
        visitType: joi.string()
            .valid('first-visit', 'follow-up', 'routine-checkup', 'urgent')
            .default('first-visit')
            .messages({
                'any.only': 'Invalid visit type'
        }),
        scheduledDate: joi.date().required().min('now').messages({
            'date.base': 'Scheduled date must be a valid date',
            'date.min': 'Scheduled date must be in the future',
            'any.required': 'Scheduled date is required'
        }),
        scheduledTime: joi.object({
            startTime: joi.string()
                .pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
                .required()
                .messages({
                    'string.pattern.base': 'Start time must be in HH:MM format',
                    'any.required': 'Start time is required'
                }),
            endTime: joi.string()
                .pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
                .required()
                .messages({
                    'string.pattern.base': 'End time must be in HH:MM format',
                    'any.required': 'End time is required'
                }),
        }).required(),
        duration: joi.number().min(15).max(180).default(30).messages({
            'number.min': 'Duration cannot be less than 15 minutes',
            'number.max': 'Duration cannot exceed 3 hours'
        }),
        reasonForVisit: joi.string().max(500).trim().optional().messages({
            'string.max': 'Reason for visit cannot exceed 500 characters'
        }),
        symptoms: joi.array().items(
            joi.object({
                name: joi.string().trim().required(),
                severity: joi.string().valid('mild', 'moderate', 'severe').optional(),
                duration: joi.string().optional()
            })
        ).optional(),
        priority: joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
        clinic: joi.object({
            clinicId: joi.string()
                .length(24)
                .hex()
                .required()
                .messages({
                    'string.length': 'clinicId must be a valid 24-character id',
                    'string.hex': 'clinicId must be a valid ObjectId',
                    'any.required': 'clinicId is required'
                }),
        }).required(),
        telemedicineDetails: joi.object({
            meetingLink: joi.string().uri().optional(),
            meetingId: joi.string().optional(),
            meetingPassword: joi.string().optional(),
            platform: joi.string().valid('zoom', 'google-meet', 'custom', 'other').optional()
        }).optional().when('appointmentType', {
            is: 'telemedicine',
            then: joi.required().messages({
                'any.required': 'Telemedicine details are required for telemedicine appointments'
            })
        }),
        notes: joi.object({
            patientNotes: joi.string().max(1000).trim().optional().messages({
                'string.max': 'Patient notes cannot exceed 1000 characters'
            }),
        }).optional(),
        payment: joi.object({
            consultationFee: joi.number().min(0).required(),
            discount: joi.number().min(0).default(0),
            totalAmount: joi.number().min(0).optional(),
            paymentMethod: joi.string()
                .valid('cash', 'credit-card', 'debit-card', 'insurance', 'online', 'other')
                .optional()
        }).optional(),
        insurance: joi.object({
            hasInsurance: joi.boolean().default(false),
            insuranceProvider: joi.string().optional(),
            policyNumber: joi.string().optional(),
            coveragePercentage: joi.number().min(0).max(100).optional()
        }).optional(),
    });

    return createAppointmentSchema.validate(data, { abortEarly: false });  
};
