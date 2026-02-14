exports.paymentConstants = Object.freeze({
    TRANSACTION_TYPES: {
        APPOINTMENT: 'appointment',
        TELEMEDICINE: 'telemedicine',
        NURSING_SERVICE: 'nursingService',
        MEDICINE_PURCHASE: 'medicinePurchase',
        SUBSCRIPTION: 'subscription',
        OTHER: 'other'
    },
    PAYMENT_METHODS: {
        CARD: 'card',
        WALLET: 'wallet',
        CASH: 'cash',
        INSURANCE: 'insurance'
    },
    STATUS: {
        PENDING: 'pending',
        COMPLETED: 'completed',
        FAILED: 'failed',
        REFUNDED_IN_PROCESS: 'refundedInProcess',
        REFUNDED: 'refunded',
        CANCELLED: 'cancelled',
        PROCESSING: 'processing',
        REFUND_FAILED: 'refundFailed'
    },
    
})