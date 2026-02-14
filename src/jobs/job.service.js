const cron = require('node-cron');
const Appointment = require('../modules/appointments/appointment.model');
const User = require('../shared/models/user.model');
const { appointmentConstants } = require('../modules/appointments/appointment.constant');
const logger = require('../core/logger');


class JobService {
    async cancelUnconfirmedAppointments() {
        logger.info('Starting Auto-Cancellation Check manually via trigger...');

        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        try {
            const result = await Appointment.updateMany(
                {
                    status: appointmentConstants.APPOINTMENT_STATUSES.PENDING,
                    paymentMethod: { 
                        $in: [
                            appointmentConstants.PAYMENT_METHODS.CARD, 
                            appointmentConstants.PAYMENT_METHODS.WALLET
                        ] 
                    }, 
                    createdAt: { $lt: tenMinutesAgo } 
                },
                {
                    $set: { 
                        status: appointmentConstants.APPOINTMENT_STATUSES.CANCELLED,
                        'cancellation.cancellationReason': 'Payment timeout (Auto-cancelled)',
                        'cancellation.cancelledAt': new Date()
                    }
                }
            );

            logger.info(`Cleanup complete. Auto-cancelled ${result.modifiedCount} unpaid appointments.`);
            return result.modifiedCount;
        } catch (error) {
            logger.error('Error in auto-cancellation logic:', error);
            throw error; 
        }
    }

    async unblockBlacklistedPatients() {
        logger.info('Starting Unblock Blacklisted Patients job manually via trigger...');
        const now = new Date();

        try {
            const result = await User.updateMany(
                {
                    'blacklist.isBlocked': true,
                    'blacklist.blockedUntil': { $lte: now }
                },
                {
                    $set: { 'blacklist.isBlocked': false, 'blacklist.blacklistPoints': 0 },
                    $unset: { 'blacklist.blockedUntil': "" }
                }
            );

            logger.info(`Unblock job complete. Unblocked ${result.modifiedCount} patients.`);
            return result.modifiedCount;
        } catch (error) {
            logger.error('Error in unblocking blacklisted patients:', error);
            throw error; 
        }

    }
}

module.exports = new JobService();