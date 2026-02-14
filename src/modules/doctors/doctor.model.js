const mongoose = require('mongoose');
const  User  = require('../../shared/models/user.model.js');
const enums = require('../../shared/constants/enums');
const validators = require('../../shared/validators/common.validator');

const doctorSchema = new mongoose.Schema({
  requiredDocuments: {
    nationalId: {
      front: {
        url: String,
        status: {
          type: String,
          enum: Object.values(enums.DOCUMENT_VERIFICATION_STATUS),
          default: enums.DOCUMENT_VERIFICATION_STATUS.NOT_UPLOADED
        },
        rejectionReason: String,
        uploadedAt: { type: Date, default: Date.now }
      },
      back: {
        url: String,
        status: {
          type: String,
          enum: Object.values(enums.DOCUMENT_VERIFICATION_STATUS),
          default: enums.DOCUMENT_VERIFICATION_STATUS.NOT_UPLOADED
        },
        rejectionReason: String,
        uploadedAt: { type: Date, default: Date.now }
      },
      number: { type: String, trim: true },
      verified: { type: Boolean, default: false }
    },

    medicalDegree: {
      url: String,
      status: {
        type: String,
        enum: Object.values(enums.DOCUMENT_VERIFICATION_STATUS),
        default: enums.DOCUMENT_VERIFICATION_STATUS.NOT_UPLOADED
      },
      rejectionReason: String,
      verified: { type: Boolean, default: false },
      university: String,
      graduationYear: Number,
      degree: String,
      uploadedAt: { type: Date, default: Date.now }
    },

    syndicateCard: {
      url: String,
      status: {
        type: String,
        enum: Object.values(enums.DOCUMENT_VERIFICATION_STATUS),
        default: enums.DOCUMENT_VERIFICATION_STATUS.NOT_UPLOADED
      },
      rejectionReason: String,
      verified: { type: Boolean, default: false },
      syndicateNumber: String,
      issueDate: Date,
      uploadedAt: { type: Date, default: Date.now }
    },

    medicalLicense: {
      url: String,
      status: {
        type: String,
        enum: Object.values(enums.DOCUMENT_VERIFICATION_STATUS),
        default: enums.DOCUMENT_VERIFICATION_STATUS.NOT_UPLOADED
      },
      rejectionReason: String,
      verified: { type: Boolean, default: false },
      licenseNumber: String,
      issueDate: Date,
      expiryDate: Date,
      uploadedAt: { type: Date, default: Date.now }
    }
  },

  professionalInfo: {
    primarySpecialization: { type: String, trim: true },
    subSpecializations: [{ type: String, trim: true }],
    highestDegree: { type: String, trim: true },
    medicalSchool: { type: String, trim: true },
    yearsOfExperience: {
      type: Number,
      min: [0, "Experience years cannot be negative"],
      default: 0,
    },
    currentPosition: { type: String, trim: true },
    hospitalAffiliation: [{ type: String, trim: true }],
    bio: { 
      type: String, 
      trim: true, 
      maxlength: [1000, "Bio cannot exceed 1000 characters"] 
    },
    certificates: [
      {
        name: { type: String, trim: true },
        institution: { type: String, trim: true },
        Year: { type: Number },
        url: String,
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    medicalMemberships: [
      {
        nameOfAssociation: { type: String, trim: true, required: true },
        memberId: { type: String, trim: true },
        Since: { type: Number }
      }
    ],
    awards: [
      {
        name: { type: String, trim: true, required: true },
        awardedBy: { type: String, trim: true },
        year: { type: Number },
        url: String,
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
  },

  clinicInfo: [
    {
      clinicName: { type: String, trim: true, required: true },
      phone: {
        type: String,
        trim: true,
        validate: validators.egyptianPhone,
        required: true,
      },
      isPrimary: { type: Boolean, default: false, index: true },
      address: {
        governorate: { type: String, trim: true, required: true },
        city: { type: String, trim: true, required: true },
        street: { type: String, trim: true, required: true },
        buildingNumber: { type: String, trim: true },
        floor: { type: String, trim: true },
        landmark: { type: String, trim: true }
      },
      location: {
        type: { type: String, default: 'Point' },
        coordinates: { 
          type: [Number], 
          index: '2dsphere' 
        } 
      },
      consultationDuration: {
        type: Number,
        min: [0, "Consultation duration cannot be negative"],
        default: 30,
        required: true,
      },
      availableHours: [
      {
        day: {
          type: String,
          enum: {
            values: Object.values(enums.DAYS_OF_WEEK),
            message: "{VALUE} is not a valid day",
          },
          required: true,
        },
        startTime: {
          type: String,
          validate: {
            validator: validators.timeFormat.validator,
            message: "Start time must be in HH:MM format",
          },
          required: true,
        },
        endTime: {
          type: String,
          validate: {
            validator: validators.timeFormat.validator,
            message: "End time must be in HH:MM format",
          },
          required: true,
        },
        _id: false
      },
      ],
      consultationFee: {
        type: Number,
        min: [0, "Consultation fee cannot be negative"],
        default: 0,
        required: true,
      },
      followUpFee: {
        type: Number,
        min: [0, "Follow-up fee cannot be negative"],
        default: 0,
        required: true,
      }
    },
  ],

  telemedicine: {
    enabled: { type: Boolean , default: false },
    consultationFee: { 
      type: Number, 
      default: 0, 
      min: [0, "Consultation fee cannot be negative"], 
      required: true 
    },
    consultationDuration: {
      type: Number,
      min: [0, "Consultation duration cannot be negative"],
      default: 30,
      required: true,
    },
    availableHours: [
        {
          day: {
            type: String,
            enum: {
              values: Object.values(enums.DAYS_OF_WEEK),
              message: "{VALUE} is not a valid day",
            },
            required: true,
          },
          startTime: {
            type: String,
            validate: {
              validator: validators.timeFormat.validator,
              message: "Start time must be in HH:MM format",
            },
            required: true,
          },
          endTime: {
            type: String,
            validate: {
              validator: validators.timeFormat.validator,
              message: "End time must be in HH:MM format",
            },
            required: true,
          },
          _id: false,
        },
      ],
  },

  settings: {
    rescheduleThreshold: { 
      type: Number, 
      default: 12, 
      min: [0, "Reschedule threshold cannot be negative"] 
    },
    cancellationThreshold: { 
      type: Number, 
      default: 24,
      min: [0, "Cancellation threshold cannot be negative"]
     }
  },

  isVerified: {
    type: Boolean,
    default: false,
  },

  accountStatus: {
    type: String,
    enum: {
      values: Object.values(enums.ACCOUNT_STATUS),
      message: "{VALUE} is not a valid account status",
    },
    default: enums.ACCOUNT_STATUS.INCOMPLETE,
  },

  adminReview: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    notes: String,
    rejectionReasons: [String]
  },

  rating: {
    type: Number,
    min: [0, "Rating cannot be less than 0"],
    max: [5, "Rating cannot be more than 5"],
    default: 0,
  },

  stats: {
    totalAppointments: { type: Number, default: 0 },
    completedAppointments: { type: Number, default: 0 },
    cancelledAppointments: { type: Number, default: 0 },
    averageRating: {
      type: Number,
      min: [0, "Average rating cannot be negative"],
      max: [5, "Average rating cannot be more than 5"],
      default: 0,
    },
    totalReviews: { type: Number, default: 0 },
    _id: false,
  }
});

doctorSchema.index({ 
  'professionalInfo.primarySpecialization': 1, 
  'clinicInfo.address.governorate': 1,
  'clinicInfo.address.city': 1,
  'accountStatus': 1,
  'rating': -1,
  'isVerified': 1
});

const Doctor = User.discriminator('doctor', doctorSchema);

module.exports = Doctor;