const mongoose = require('mongoose');
const enums = require('../../shared/constants/enums');
const validators = require('../../shared/validators/common.validator');

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

    appointmentType: {
      type: String,
      enum: {
        values: ['in-person', 'telemedicine', 'emergency', 'consultation'],
        message: '{VALUE} is not a valid appointment type'
      },
      required: true,
      default: 'in-person'
    },

    visitType: {
      type: String,
      enum: {
        values: ['first-visit', 'follow-up', 'routine-checkup', 'urgent'],
        message: '{VALUE} is not a valid visit type'
      },
      default: 'first-visit'
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

    duration: {
      type: Number, 
      default: 30,
      min: [15, 'Duration cannot be less than 15 minutes'],
      max: [180, 'Duration cannot exceed 3 hours']
    },

    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'checked-in', 'in-progress', 'completed', 'cancelled', 'rescheduled'],
        message: '{VALUE} is not a valid status'
      },
      default: 'pending',
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

    reasonForVisit: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason for visit cannot exceed 500 characters']
    },

    symptoms: [
      {
        name: { type: String, trim: true },
        severity: {
          type: String,
          enum: ['mild', 'moderate', 'severe']
        },
        duration: String, // e.g., "3 days", "2 weeks"
        _id: false
      }
    ],

    notes: {
      patientNotes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Patient notes cannot exceed 1000 characters']
      },
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
      labTests: [
        {
          testName: String,
          urgency: {
            type: String,
            enum: ['routine', 'urgent', 'stat']
          },
          status: {
            type: String,
            enum: ['ordered', 'completed', 'cancelled']
          },
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

    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: {
          type: String,
          enum: ['image', 'pdf', 'document', 'lab-result', 'xray', 'other']
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        },
        description: String
      }
    ],

    payment: {
      consultationFee: {
        type: Number,
        required: true,
        min: [0, 'Fee cannot be negative']
      },
      discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative']
      },
      totalAmount: {
        type: Number,
      },
      paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'partially-paid', 'refunded', 'cancelled'],
        default: 'pending',
        index: true
      },
      paymentMethod: {
        type: String,
        enum: ['cash', 'credit-card', 'debit-card', 'insurance', 'online', 'other']
      },
      paidAt: Date,
      transactionId: String,
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
        enum: ['not-applicable', 'pending', 'processed', 'rejected']
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

    // Reminders & Notifications
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

    // Consultation Completion
    completedAt: Date,
    actualDuration: Number, 

    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
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
  return this.scheduledDate > new Date() && ['pending', 'confirmed'].includes(this.status);
});

appointmentSchema.virtual('isPast').get(function() {
  return this.scheduledDate < new Date();
});

appointmentSchema.virtual('canBeCancelled').get(function() {
  const hoursDifference = (this.scheduledDate - new Date()) / (1000 * 60 * 60);
  return hoursDifference > 24 && ['pending', 'confirmed'].includes(this.status);
});

appointmentSchema.virtual('canBeRescheduled').get(function() {
  const hoursDifference = (this.scheduledDate - new Date()) / (1000 * 60 * 60);
  return hoursDifference > 12 && ['pending', 'confirmed'].includes(this.status);
});

// ==================== PRE HOOKS ====================
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
  if (this.payment && this.payment.consultationFee !== undefined) {
    const fee = this.payment.consultationFee || 0;
    const discount = this.payment.discount || 0;
    this.payment.totalAmount = fee - discount;
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

// ==================== METHODS ====================
appointmentSchema.methods.cancel = function(userId, reason) {
  this.status = 'cancelled';
  this.cancellation = {
    cancelledBy: userId,
    cancelledAt: new Date(),
    cancellationReason: reason
  };
  return this.save();
};

appointmentSchema.methods.reschedule = function(userId, newDate, newTime, reason) {
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
  this.status = 'rescheduled';
  
  return this.save();
};

appointmentSchema.methods.performCheckIn = function(userId, queueNumber) {
  this.status = 'checked-in';
  this.checkIn = {
    checkedInAt: new Date(),
    checkedInBy: userId,
    queueNumber: queueNumber
  };
  return this.save();
};

appointmentSchema.methods.complete = function(visitData) {
  this.status = 'completed';
  this.completedAt = new Date();
  
  if (visitData) {
    this.visitSummary = { ...this.visitSummary, ...visitData };
  }
  
  // Calculate actual duration
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
    status: { $in: ['pending', 'confirmed', 'checked-in'] }
  })
  .sort({ scheduledDate: 1 })
  .limit(limit)
  .populate('patient', 'firstName lastName phone email profileImage');
};

appointmentSchema.statics.getUpcomingForPatient = function(patientId, limit = 10) {
  return this.find({
    patient: patientId,
    scheduledDate: { $gte: new Date() },
    status: { $in: ['pending', 'confirmed'] }
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
    status: { $nin: ['cancelled', 'no-show'] }
  })
  .sort({ 'scheduledTime.startTime': 1 })
  .populate('patient', 'firstName lastName phone');
};

appointmentSchema.statics.checkAvailability = function(doctorId, date, startTime, endTime) {
  return this.findOne({
    doctor: doctorId,
    scheduledDate: date,
    status: { $nin: ['cancelled', 'no-show'] },
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