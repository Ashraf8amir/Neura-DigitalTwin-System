const mongoose = require('mongoose');
const User = require('../../shared/models/user.model');
const enums = require('../../shared/constants/enums');
const validators = require('../../shared/validators/common.validator');
const { patientConstants } = require('./patient.constant');


const patientSchema = new mongoose.Schema({
  height: { type: Number, min: [0, "Height cannot be negative"] },
  weight: { type: Number, min: [0, "Weight cannot be negative"] },
  bloodType: {
    type: String,
    enum: {
      values: patientConstants.BLOOD_TYPES,
      message: "{VALUE} is not a valid blood type",
    },
  },
  nationalId: {
    type: String,
    unique: true,
    sparse: true,
    validate: validators.nationalId,
  },
  maritalStatus: {
    type: String,
    enum: {
      values: Object.values(enums.MARITAL_STATUS),
      message:
        "{VALUE} is not valid. Marital status must be one of: single, married, divorced, widowed",
    },
  },

  medicalProfile: {
    chronicDiseases: [
      {
        nameOfDisease: { type: String, trim: true, required: true },
        type: { type: String, trim: true },
        since: { 
          type: Number,
          validate: {
            validator: function(year) {
              return year <= new Date().getFullYear();
            },
            message: 'Year cannot be in the future'
          }
        },
      },
    ],
    allergies: [
      {
        nameOfAllergy: { type: String, trim: true, required: true },
        types: [
          {
            reaction: { type: String, trim: true },
            severity: { type: String, enum: patientConstants.ALLERGY_SEVERITY },
            _id: false,
          },
        ],
      },
    ],
    previousSurgeries: [
      {
        nameOfSurgery: { type: String, trim: true },
        date: { type: Date },
        hospital: { type: String, trim: true },
        doctor: { type: String, trim: true },
        notes: { type: String, trim: true },
      },
    ],
    familyMedicalHistory: [
      {
        nameOfFamilyMember: { type: String, trim: true },
        nameOfDisease: { type: String, trim: true },
        age: { type: Number },
      },
    ],
    currentMedications: [
        {
          name: { type: String, trim: true },
          reason: { type: String, trim: true },
          dosage: { type: String, trim: true },
        },
    ],
    lifestyle: {
      smokingStatus: {
        type: String,
        enum: {
          values: patientConstants.SMOKING_STATUS,
          message: "{VALUE} is not a valid smoking status",
        },
      },
      alcoholConsumption: {
        type: String,
        enum: {
          values: patientConstants.ALCOHOL_CONSUMPTION,
          message: "{VALUE} is not a valid alcohol consumption level",
        },
      },
      physicalActivity: {
        type: String,
        enum: {
          values: patientConstants.PHYSICAL_ACTIVITY,
          message: "{VALUE} is not a valid physical activity level",
        },
      },
      dietType: { type: String, trim: true },
      sleepQuality: {
        type: String,
        enum: {
          values: patientConstants.SLEEP_QUALITY,
          message: "{VALUE} is not a valid sleep quality",
        },
      },
      averageSleepHours: { type: Number, min: 0, max: 24 },
      _id: false,
    },
  },

  emergencyContacts: [
    {
      name: { type: String, trim: true, required: true },
      relationship: { type: String, trim: true, required: true },
      phoneNumber: {
        type: String,
        trim: true,
        required: true,
        validate: validators.egyptianPhone,
      },
      alternativePhone: {
        type: String,
        trim: true,
        validate: validators.egyptianPhone,
      },
      email: { type: String, lowercase: true, trim: true, validate: validators.email },
    },
  ],
  accountStatus: {
    type: String,
    enum: {
      values: Object.values(enums.ACCOUNT_STATUS),
      message: "{VALUE} is not a valid account status",
    },
    default: enums.ACCOUNT_STATUS.INCOMPLETE,
  },
  blacklist: { 
    blacklistPoints: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
    blockedUntil: { type: Date },
    reason: { type: String, trim: true },
    consecutiveSuccessiveAppointments: { type: Number, default: 0 }
  },
});

patientSchema.virtual("bmi").get(function () {
  if (this.height > 0 && this.weight > 0) {
    const heightInMeters = this.height / 100;
    return Number((this.weight / (heightInMeters * heightInMeters)).toFixed(1));
  }
  return null;
});

patientSchema.index({ 'emergencyContacts.phoneNumber': 1 });
patientSchema.index({ bloodType: 1 });

const Patient = User.discriminator('patient', patientSchema);

module.exports = Patient;