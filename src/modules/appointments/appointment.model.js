const mongoose = require('mongoose');
const validators = require('../../shared/validators/common.validator');
const { appointmentConstants } = require('./appointment.constant');

const appointmentSchema = new mongoose.Schema(
  {
    appointmentNumber: {
      type: String,
      unique: true,
      required: true,
      index: true
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient is required'],
      index: true
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor is required'],
      index: true
    },

    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
      index: true
    },

    scheduledTime: {
      startTime: {
        type: String,
        required: true,
        validate: {
          validator: validators.timeFormat.validator,
          message: 'Start time must be in HH:MM format'
        }
      },
      endTime: {
        type: String,
        required: true,
        validate: {
          validator: validators.timeFormat.validator,
          message: 'End time must be in HH:MM format'
        }
      },
      _id: false
    },

    appointmentType: {
      type: String,
      enum: {
        values: Object.values(appointmentConstants.APPOINTMENT_TYPES),
        message: '{VALUE} is not a valid appointment type'
      },
      required: true,
      default: appointmentConstants.APPOINTMENT_TYPES.IN_PERSON
    },

    clinic: {
      clinicId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
      },
      clinicName: String,
      address: {
        governorate: String,
        city: String,
        street: String,
        buildingNumber: String,
        floor: String,
        landmark: String
      },
      location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number]
      },
      _id: false
    },

    telemedicineDetails: {
      meetingLink: String,
      meetingId: String,
      meetingPassword: String,
      platform: {
        type: String,
        enum: ['zoom', 'google-meet', 'custom', 'other']
      },
      _id: false
    },

    patientProvidedInfo: {

       visitType: {
        type: String,
        enum: {
          values: Object.values(appointmentConstants.VISIT_TYPES),
          message: '{VALUE} is not a valid visit type'
        },
        default: appointmentConstants.VISIT_TYPES.NEW_PATIENT
      },

      reasonForVisit: {
        type: String,
        trim: true,
        maxlength: [500, 'Reason for visit cannot exceed 500 characters']
      },

      patientNotes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Patient notes cannot exceed 1000 characters']
      },

      attachments: [
        {
          fileName: String,
          fileUrl: String,
          description: String,
          uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          },
          uploadedAt: {
            type: Date,
            default: Date.now
          },
        }
      ]
    },

    duration: {
      type: Number, 
      default: 30,
      min: [15, 'Duration cannot be less than 15 minutes'],
      max: [180, 'Duration cannot exceed 3 hours']
    },

    status: {
      type: String,
      enum: {
        values: Object.values(appointmentConstants.APPOINTMENT_STATUSES),
        message: '{VALUE} is not a valid status'
      },
      default: appointmentConstants.APPOINTMENT_STATUSES.PENDING,
      required: true,
      index: true
    },

    statusHistory: [
      {
        status: String,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        changedAt: {
          type: Date,
          default: Date.now
        },
        reason: String,
        _id: false
      }
    ],

    symptoms: [
      {
        name: { type: String, trim: true },
        severity: {
          type: String,
          enum: Object.values(appointmentConstants.SYMPTOMS),
          message: '{VALUE} is not a valid symptom severity'
        },
        duration: String, 
        _id: false
      }
    ],

    notes: {
      doctorNotes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Doctor notes cannot exceed 2000 characters']
      },
      internalNotes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Internal notes cannot exceed 1000 characters']
      }
    },

    referrals: [
      {
        specialization: {
          type: String,
          trim: true
        },
        doctorName: {
          type: String,
          trim: true
        },
        reason: {
          type: String,
          required: true,
          trim: true
        },
        urgency: {
          type: String,
          enum: ['routine', 'urgent', 'emergency'],
          default: 'routine'
        }
      }
    ],
    
    visitSummary: {
      diagnosis: String,
      treatmentPlan: String,
      prescriptions: [
        {
          medicationName: String,
          dosage: String,
          frequency: String,
          duration: String,
          instructions: String,
          _id: false
        }
      ],
      referrals: [
        {
          specialization: String,
          doctorName: String,
          reason: String,
          _id: false
        }
      ],
      followUpRequired: {
        type: Boolean,
        default: false
      },
      followUpDate: Date,
      _id: false
    },

    vitalSigns: {
      bloodPressure: {
        systolic: Number,
        diastolic: Number
      },
      heartRate: Number,
      temperature: Number,
      weight: Number,
      height: Number,
      oxygenSaturation: Number,
      respiratoryRate: Number,
      recordedAt: Date,
      recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      _id: false
    },

    payment: {
      paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        index: true
      },
      method: {
        type: String,
        enum: Object.values(appointmentConstants.PAYMENT_METHODS)
      },
      consultationFee: { type: Number, required: true },
      totalAmount: { type: Number },
      paid: { type: Boolean, default: false },
      paidAt: Date,
      _id: false
    },

    insurance: {
      hasInsurance: {
        type: Boolean,
        default: false
      },
      insuranceProvider: String,
      policyNumber: String,
      coveragePercentage: {
        type: Number,
        min: 0,
        max: 100
      },
      authorizationCode: String,
      claimStatus: {
        type: String,
        enum: ['not-submitted', 'submitted', 'approved', 'rejected', 'partially-approved']
      },
      _id: false
    },

    cancellation: {
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      cancelledAt: Date,
      cancellationReason: {
        type: String,
        trim: true
      },
      refundAmount: Number,
      refundStatus: {
        type: String,
        enum: Object.values(appointmentConstants.REFUND_STATUSES)
      },
      _id: false
    },

    rescheduling: {
      rescheduledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rescheduledAt: Date,
      previousDate: Date,
      previousTime: {
        startTime: String,
        endTime: String
      },
      reason: String,
      rescheduledCount: {
        type: Number,
        default: 0
      },
      _id: false
    },

    reminders: [
      {
        type: {
          type: String,
          enum: ['sms', 'email', 'push', 'whatsapp']
        },
        sentAt: Date,
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'failed']
        },
        _id: false
      }
    ],

    checkIn: {
      checkedInAt: Date,
      checkedInBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      queueNumber: Number,
      _id: false
    },

    completedAt: Date,
    actualDuration: Number, 

    priority: {
      type: String,
      enum: Object.values(appointmentConstants.PRIORITIES),
      default: appointmentConstants.PRIORITIES.MEDIUM,
      index: true
    },

    tags: [
      {
        type: String,
        trim: true
      }
    ],

    review: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: {
        type: String,
        trim: true,
        maxlength: [500, 'Review comment cannot exceed 500 characters']
      },
      reviewedAt: Date,
      _id: false
    },

    isEmergency: {
      type: Boolean,
      default: false,
      index: true
    },

    isFollowUp: {
      type: Boolean,
      default: false
    },

    parentAppointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment'
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);


appointmentSchema.index({ scheduledDate: 1, 'scheduledTime.startTime': 1 });
appointmentSchema.index({ patient: 1, scheduledDate: -1 });
appointmentSchema.index({ doctor: 1, scheduledDate: 1, status: 1 });
appointmentSchema.index({ 'clinic.clinicId': 1, scheduledDate: 1 });
appointmentSchema.index({ status: 1, scheduledDate: 1 });
appointmentSchema.index({ createdAt: -1 });
appointmentSchema.index({ appointmentType: 1, status: 1 });
appointmentSchema.index({ doctor: 1, scheduledDate: 1, 'scheduledTime.startTime': 1, status: 1 });


appointmentSchema.virtual('isUpcoming').get(function() {
  return this.scheduledDate > new Date() && [appointmentConstants.APPOINTMENT_STATUSES.PENDING, appointmentConstants.APPOINTMENT_STATUSES.CONFIRMED].includes(this.status);
});

appointmentSchema.virtual('isPast').get(function() {
  return this.scheduledDate < new Date();
});

appointmentSchema.virtual('canBeRescheduled').get(function() {
  const threshold = this.doctor?.settings?.rescheduleThreshold || 12;

  const hoursDifference = (this.scheduledDate - new Date()) / (1000 * 60 * 60);

  return hoursDifference >= threshold;
});

appointmentSchema.pre(/^find/, async function() {
  this.find({ isDeleted: { $ne: true } });
});
appointmentSchema.pre('validate', async function() {
  if (this.isNew && !this.appointmentNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      }
    });
    
    this.appointmentNumber = `APT-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;
  }
});
appointmentSchema.pre('save', async function() {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date()
    });
  }
});

appointmentSchema.methods.cancel = async function(userId, role, reason, userDocument, refundPercentage, options = {}) {
  const { APPOINTMENT_STATUSES } = appointmentConstants;
  const hoursDifference = (this.scheduledDate - new Date()) / (1000 * 60 * 60);
  let pointsToAdd = 0;

  if (role === 'patient') {
    if (hoursDifference < 12) {
      pointsToAdd = this.payment.paid ? 1 : 3;
    }

    if (pointsToAdd > 0 && userDocument) {
      userDocument.blacklist.blacklistPoints += pointsToAdd;
      userDocument.blacklist.consecutiveSuccessiveAppointments = 0;
      
      if (userDocument.blacklist.blacklistPoints >= 10) {
        userDocument.blacklist.isBlocked = true;
        userDocument.blacklist.reason = 'Exceeded maximum cancellation points';
        userDocument.blacklist.blockedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
      await userDocument.save(options);
    }
  }

  this.cancellation = {
    cancelledBy: userId,
    cancelledAt: new Date(),
    cancellationReason: reason,
    refundAmount: Math.round((this.payment.totalAmount * refundPercentage) * 100) / 100,
    refundStatus: this.payment.paid ? appointmentConstants.REFUND_STATUSES.PENDING : appointmentConstants.REFUND_STATUSES.NOT_APPLICABLE
  };

  this.status = APPOINTMENT_STATUSES.CANCELLED;

  return this.save(options);
};

appointmentSchema.methods.reschedule = function(userId, newDate, newTime, reason, options = {}) {
  this.rescheduling = {
    rescheduledBy: userId,
    rescheduledAt: new Date(),
    previousDate: this.scheduledDate,
    previousTime: { ...this.scheduledTime },
    reason: reason,
    rescheduledCount: (this.rescheduling?.rescheduledCount || 0) + 1
  };
  
  this.scheduledDate = newDate;
  this.scheduledTime = newTime;
  if (options.newClinicData) {
    this.clinic = options.newClinicData;
  }
  
  return this.save(options);
};

appointmentSchema.methods.performCheckIn = function(userId, queueNumber) {
  this.status = appointmentConstants.APPOINTMENT_STATUSES.CHECKEDIN;
  this.checkIn = {
    checkedInAt: new Date(),
    checkedInBy: userId,
    queueNumber: queueNumber
  };
  return this.save();
};

appointmentSchema.methods.complete = function(visitData) {
  this.status = appointmentConstants.APPOINTMENT_STATUSES.COMPLETED;
  this.completedAt = new Date();
  
  if (visitData) {
    this.visitSummary = { ...this.visitSummary, ...visitData };
  }
  
  if (this.checkIn?.checkedInAt) {
    const duration = (new Date() - this.checkIn.checkedInAt) / (1000 * 60);
    this.actualDuration = Math.round(duration);
  }
  
  return this.save();
};

appointmentSchema.methods.addReview = function(rating, comment) {
  this.review = {
    rating: rating,
    comment: comment,
    reviewedAt: new Date()
  };
  return this.save();
};

// ==================== STATICS ====================
appointmentSchema.statics.getUpcomingForDoctor = function(doctorId, limit = 10) {
  return this.find({
    doctor: doctorId,
    scheduledDate: { $gte: new Date() },
    status: { $in: [appointmentConstants.APPOINTMENT_STATUSES.PENDING, appointmentConstants.APPOINTMENT_STATUSES.CONFIRMED, appointmentConstants.APPOINTMENT_STATUSES.CHECKEDIN] }
  })
  .sort({ scheduledDate: 1 })
  .limit(limit)
  .populate('patient', 'firstName lastName phone email profileImage');
};

appointmentSchema.statics.getUpcomingForPatient = function(patientId, limit = 10) {
  return this.find({
    patient: patientId,
    scheduledDate: { $gte: new Date() },
    status: { $in: [appointmentConstants.APPOINTMENT_STATUSES.PENDING, appointmentConstants.APPOINTMENT_STATUSES.CONFIRMED] }
  })
  .sort({ scheduledDate: 1 })
  .limit(limit)
  .populate('doctor', 'firstName lastName professionalInfo.primarySpecialization profileImage');
};

appointmentSchema.statics.getTodayAppointments = function(doctorId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    doctor: doctorId,
    scheduledDate: { $gte: today, $lt: tomorrow },
    status: { $nin: [appointmentConstants.APPOINTMENT_STATUSES.CANCELLED] }
  })
  .sort({ 'scheduledTime.startTime': 1 })
  .populate('patient', 'firstName lastName phone');
};

appointmentSchema.statics.checkAvailability = function(doctorId, date, startTime, endTime) {
  return this.findOne({
    doctor: doctorId,
    scheduledDate: date,
    status: { $nin: [appointmentConstants.APPOINTMENT_STATUSES.CANCELLED] },
    'scheduledTime.startTime': { $lt: endTime },
    'scheduledTime.endTime': { $gt: startTime }
    
  });
};

const transformFn = (doc, ret) => {
    if (ret.doctor && typeof ret.doctor === 'object' && ret.doctor.firstName) {
        ret.doctor = {
            id: ret.doctor._id || ret.doctor.id,
            firstName: ret.doctor.firstName,
            lastName: ret.doctor.lastName,
            fullName: ret.doctor.fullName, 
            age: ret.doctor.age,
            primarySpecialization: ret.doctor.professionalInfo?.primarySpecialization,
            rating: ret.doctor.rating
        };
    }
    

    delete ret._id;
    delete ret.__v;
    delete ret.isDeleted;
    delete ret.deletedAt;
    delete ret.deletedBy;
    delete ret.createdAt;
    delete ret.updatedAt;
    
    return ret;
};

appointmentSchema.set('toJSON', { virtuals: true, transform: transformFn });
appointmentSchema.set('toObject', { virtuals: true, transform: transformFn });


const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;