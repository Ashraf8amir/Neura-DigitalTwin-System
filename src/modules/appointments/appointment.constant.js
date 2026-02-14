exports.appointmentConstants = Object.freeze({
    APPOINTMENT_STATUSES: {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        CHECKEDIN: 'checkedIn',
        INPROGRESS: 'inProgress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        NO_SHOW: 'noShow'
    },
    APPOINTMENT_TYPES: {
        IN_PERSON: 'inPerson',
        TELEMEDICINE: 'telemedicine',
        EMERGENCY: 'emergency',
        CONSULTATION: 'consultation',
        FOLLOW_UP: 'followUp',
    },
    VISIT_TYPES: {
        NEW_PATIENT: 'newPatient',
        FOLLOW_UP: 'followUp',
        ROUTINE_CHECKUP: 'routineCheckup',
        EMERGENCY: 'emergency'
    },
    PRIORITIES: {
        LOW: 'low',
        MEDIUM: 'medium',
        HIGH: 'high',
        NORMAL: 'normal',
        URGENT: 'urgent'
    },
    PAYMENT_STATUSES: {
        PAID: 'paid',
        PENDING: 'pending',
        PARTIALLY_PAID: 'partiallyPaid',
        REFUNDED: 'refunded',
        FAILED: 'failed',
        CANCELLED: 'cancelled'
    },
    PAYMENT_METHODS: {
        CASH: 'cash',
        WALLET: 'wallet',
        CARD: 'card',
        INSURANCE: 'insurance',
    },
    SYMPTOMS: {
        MILD: 'mild',
        MODERATE: 'moderate',
        SEVERE: 'severe'
    },
    REFUND_STATUSES: {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        PROCESSED: 'processed',
        NOT_APPLICABLE: 'notApplicable'
    }
});