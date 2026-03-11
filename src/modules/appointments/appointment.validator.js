const joi = require('joi');
const { appointmentConstants } = require('./appointment.constant');

exports.createAppointmentSchema = (data) => {
    const createAppointmentSchema = joi.object({
        patientId: joi.string().length(24).hex().optional().messages({
                'string.length': 'patientId must be a valid 24-character id',
                'string.hex': 'patientId must be a valid ObjectId'
        }),
        doctorId: joi.string().length(24).hex().required().messages({
                'string.length': 'doctorId must be a valid 24-character id',
                'string.hex': 'doctorId must be a valid ObjectId',
                'any.required': 'doctorId is required'
        }),
        appointmentType: joi.string().valid(...Object.values(appointmentConstants.APPOINTMENT_TYPES)).required().messages({
                'any.only': 'Appointment type must be either in-person or telemedicine',
                'any.required': 'Appointment type is required'
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
        clinicId: joi.string().length(24).hex().required().messages({
                'string.length': 'clinicId must be a valid 24-character id',
                'string.hex': 'clinicId must be a valid ObjectId',
                'any.required': 'clinicId is required'
        }),
        paymentMethod: joi.string().valid(...Object.values(appointmentConstants.PAYMENT_METHODS)).required().messages({
                'any.only': 'Payment method must be card, wallet, or cash',
                'any.required': 'Payment method is required'
        })
    });

    return createAppointmentSchema.validate(data, { abortEarly: false });  
};
exports.rescheduleAppointmentSchema = (data) => {
    const rescheduleAppointmentSchema = joi.object({
        newDate: joi.date().required().min('now').messages({
            'date.base': 'New date must be a valid date',
            'date.min': 'New date must be in the future',
            'any.required': 'New date is required'
        }),
        newTime: joi.object({
            startTime: joi.string()
                .pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
                .required()
                .messages({
                    'string.pattern.base': 'New start time must be in HH:MM format',
                    'any.required': 'New start time is required'
                }),
            endTime: joi.string()
                .pattern(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
                .required()
                .messages({
                    'string.pattern.base': 'New end time must be in HH:MM format',
                    'any.required': 'New end time is required'
                }),
        }).required(),
        reason: joi.string().max(500).optional().messages({
            'string.base': 'Reason must be a string',
            'string.max': 'Reason cannot exceed 500 characters',
            'any.required': 'Reason for rescheduling is required'
        })
    });

    return rescheduleAppointmentSchema.validate(data, { abortEarly: false });
};

exports.updatePatientVisitInfoSchema = (data) => {
    const updatePatientVisitInfoSchema = joi.object({
      patientProvidedInfo: joi.object({
        visitType: joi.string()
          .valid(...Object.values(appointmentConstants.VISIT_TYPES))
          .optional()
          .messages({
            'any.only': 'visitType is not valid'
          }),
        reasonForVisit: joi.string()
          .max(500)
          .allow(null, '')
          .optional()
          .messages({
            'string.max': 'reasonForVisit cannot exceed 500 characters'
          }),
        patientNotes: joi.string()
          .max(1000)
          .allow(null, '')
          .optional()
          .messages({
            'string.max': 'patientNotes cannot exceed 1000 characters'
          })
      }).optional()
    });

    return updatePatientVisitInfoSchema.validate(data, { abortEarly: false });
};