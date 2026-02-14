const ENUMS = Object.freeze({
  ROLE: {
    DOCTOR: 'doctor',
    PATIENT: 'patient',
    NURSE: 'nurse',
    PHARMACY: 'pharmacy',
    ADMIN: 'admin',
    PLATFORM: 'platform'
  },
  HTTP_STATUS_TEXT:{
    SUCCESS : 'success',
    ERROR : 'error',
    NOT_FOUND : 'not found',
    UNAUTHORIZED : 'unauthorized',
    FAIL : 'fail',
    FORBIDDEN : 'forbidden',
    BAD_REQUEST : 'bad request',
    CREATED : 'created',
    NO_CONTENT : 'no content',
    LOCKED: 'locked',
    OK: 'ok',
    CONFLICT: 'conflict'
  },
  GENDERS: { 
    MALE: 'male',
    FEMALE: 'female'
  },
  DAYS_OF_WEEK: {
    SUNDAY: "Sunday",
    MONDAY: "Monday",
    TUESDAY: "Tuesday",
    WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday",
    FRIDAY: "Friday",
    SATURDAY: "Saturday"
  },
  MARITAL_STATUS: {
      SINGLE: 'single',
      MARRIED: 'married',
      DIVORCED: 'divorced',
      WIDOWED: 'widowed'
  },
  ACCOUNT_STATUS: {
      ACTIVE: 'active',
      SUSPENDED: 'suspended',
      PENDING_VERIFICATION: 'pending_verification',
      BLOCKED: 'blocked',
      INCOMPLETE: 'incomplete',
      REJECTED: 'rejected'
  },
  DOCUMENT_VERIFICATION_STATUS: {
      NOT_UPLOADED: 'not_uploaded',
      UPLOADED: 'uploaded',
      VERIFIED: 'verified',
      REJECTED: 'rejected'
  },
});
module.exports = ENUMS;