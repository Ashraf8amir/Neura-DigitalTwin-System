const paymentHelper = require('./payment.helper');
const Payment = require('./payment.model');
const paymob = require('../../config/paymob');
const { paymentConstants } = require('./payment.constant');
const { appointmentConstants } = require('../appointments/appointment.constant');
const User = require('../../shared/models/user.model');
const Appointment = require('../appointments/appointment.model');
const { ROLE } = require('../../shared/constants/enums.js');
const logger = require('../../core/logger.js');


class PaymentService {
    async getBillingData(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found for billing data');
        }

        return {
            apartment: "NA",
            email: user.email,
            floor: "NA",
            first_name: user.firstName,
            last_name: user.lastName,
            phone_number: user.phone,
            street: user.address?.street || "NA",
            building: "NA",
            shipping_method: "NA",
            postal_code: "NA",
            city: user.address?.city || "Cairo",
            country: "EG",
            state: user.address?.governorate || "Cairo"
        };
    }



    async initiatePaymentService(paymentData){
        const {
            payerId,
            payerRole,
            receiverId,
            receiverRole,
            transactionType,
            amount,
            paymentMethod,
            referenceId, 
            metadata
        } = paymentData;

        const commission = paymentHelper.calculateCommission(amount, receiverRole);

        const payment = await Payment.create({
            payer: {
                user: payerId,
                role: payerRole
            },
            receiver: {
                user: receiverId,
                role: receiverRole
            },
            transactionType: transactionType,
            amount: {
                total: amount
            },
            commission: commission,
            paymentMethod: paymentMethod,
            status: paymentConstants.STATUS.PENDING,
            metadata: metadata
        });

        if (transactionType === paymentConstants.TRANSACTION_TYPES.APPOINTMENT) {
            payment.appointment = referenceId;
        } else if (transactionType === paymentConstants.TRANSACTION_TYPES.NURSING_SERVICE) {
            payment.nursingService = referenceId;
        } else if (transactionType === paymentConstants.TRANSACTION_TYPES.MEDICINE_PURCHASE) {
            payment.medicineOrder = referenceId;
        }

        await payment.save();

         if (paymentMethod === paymentConstants.PAYMENT_METHODS.CARD || paymentMethod === paymentConstants.PAYMENT_METHODS.WALLET) {
            const billingData = await this.getBillingData(payerId);

            const paymobResponse = await paymob.initiatePayment({
                amount: amount,
                currency: 'EGP',
                paymentMethod: paymentMethod,
                billingData: billingData
            });

            payment.paymob.orderId = paymobResponse.orderId;
            payment.paymob.paymentToken = paymobResponse.paymentToken;
            payment.status = paymentConstants.STATUS.PROCESSING;
            await payment.save();

            return {
                paymentId: payment._id,
                iframeUrl: paymobResponse.iframeUrl,
                paymentToken: paymobResponse.paymentToken
            };
        }

        return {
            paymentId: payment._id,
            status: payment.status
        };
    }

    async _handleRefundLogic(payment, processedData, callbackData) {
        if (payment.status === paymentConstants.STATUS.REFUNDED) {
            logger.info(`Payment for order ${processedData.orderId} is already REFUNDED. Skipping.`);
            return payment;
        }

        const relatedServices = ['appointment', 'nursingService', 'medicineOrder'];

        if (processedData.success) {
            payment.status = paymentConstants.STATUS.REFUNDED;
            payment.refund.refundedAt = new Date();

            for (const serviceKey of relatedServices) {
                const serviceDoc = payment[serviceKey];

                if (serviceDoc) {
                    serviceDoc.payment.paid = false;
                    serviceDoc.payment.paidAt = null;

                    if (serviceKey === 'appointment' && serviceDoc.cancellation) {
                        serviceDoc.cancellation.refundStatus = appointmentConstants.REFUND_STATUSES.APPROVED;
                    }

                    await serviceDoc.save();
                }
            }
        } else {
            payment.status = paymentConstants.STATUS.REFUND_FAILED; 
            payment.error.message = callbackData.data?.message || 'Refund rejected by provider';

            if (payment.appointment && payment.appointment.cancellation) {
                payment.appointment.cancellation.refundStatus = appointmentConstants.REFUND_STATUSES.REJECTED;
                await payment.appointment.save();
            }
        }

        await payment.save();
        return payment;
    }

    async _handlePaymentLogic(payment, processedData, callbackData) {
        if (payment.status === paymentConstants.STATUS.COMPLETED) {
            logger.log(`Payment for order ${processedData.orderId} is already COMPLETED. Skipping duplicate callback.`);
            return payment;
        }

        payment.paymob.transactionId = processedData.transactionId;
        payment.paymob.response = callbackData;

        if (processedData.success && !processedData.pending) {
            payment.status = paymentConstants.STATUS.COMPLETED;
            payment.paidAt = new Date();

            const services = ['appointment', 'nursingService', 'medicineOrder'];
            for (const service of services) {
                if (payment[service]) {
                    payment[service].payment.paid = true;
                    payment[service].payment.paidAt = new Date();
                    payment[service].status = appointmentConstants.APPOINTMENT_STATUSES.CONFIRMED;

                    await payment[service].save();
                }
            }
        } else if (processedData.pending) {
            payment.status = paymentConstants.STATUS.PROCESSING;
        } else {
            payment.status = paymentConstants.STATUS.FAILED;
            payment.failedAt = new Date();
            payment.error.message = callbackData.data?.message || 'Payment failed';
        }

        await payment.save();
        return payment;
    }

    async handlePaymobCallbackService(callbackData) {
        const processedData = paymob.processCallback(callbackData);

        const payment = await Payment.findOne({
            'paymob.orderId': processedData.orderId
        }).populate('appointment nursingService medicineOrder');

        if (!payment) {
            throw new AppError(404, httpStatus.FAIL, 'Payment not found');
        }

        const isRefundAction = callbackData.obj?.is_refund === true || callbackData.obj?.type === 'REFUND';

        if (isRefundAction) {
            return await this._handleRefundLogic(payment, processedData, callbackData);
        }

        return await this._handlePaymentLogic(payment, processedData, callbackData);
    }

    async initiateAppointmentPaymentService(patientId, appointmentId, paymentMethod, amount) {
        const appointment = await Appointment.findById(appointmentId)
            .populate('doctor patient');

        if (!appointment) {
            throw new AppError(404, httpStatus.FAIL, 'Appointment not found');
        }

        if (appointment.patient._id.toString() !== patientId) {
            throw new AppError(403, httpStatus.FAIL, 'Unauthorized');
        }

        return await this.initiatePaymentService({
            payerId: patientId,
            payerRole: ROLE.PATIENT,
            receiverId: appointment.doctor._id,
            receiverRole: ROLE.DOCTOR,
            transactionType: paymentConstants.TRANSACTION_TYPES.APPOINTMENT,
            amount: amount,
            paymentMethod: paymentMethod,
            referenceId: appointmentId,
            metadata: {
                description: `Appointment with Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
                appointmentDate: appointment.scheduledDate
            }
        });
    }

    async getPaymentsByRoleService(userId, userRole, filters = {}) {
        let query;

        if (userRole === ROLE.PATIENT) {
            query = { 'payer.user': userId };
        } else if ([ROLE.DOCTOR, ROLE.NURSE, ROLE.PHARMACY].includes(userRole)) {
            query = { 'receiver.user': userId };
        } else {
            throw new AppError(403, httpStatus.FAIL, 'Invalid role');
        }

        if (filters.status) query.status = filters.status;
        if (filters.transactionType) query.transactionType = filters.transactionType;
        if (filters.dateFrom) {
            query.createdAt = { $gte: new Date(filters.dateFrom) };
        }
        if (filters.dateTo) {
            query.createdAt = {
                ...query.createdAt,
                $lte: new Date(filters.dateTo)
            };
        }

        const payments = await Payment.find(query)
            .populate('payer.user', 'firstName lastName email')
            .populate('receiver.user', 'firstName lastName email')
            .populate('appointment')
            .populate('nursingService')
            .populate('medicineOrder')
            .sort({ createdAt: -1 })
            .limit(filters.limit || 50);

        return payments;
    }

     async getRevenueSummaryService(userId, userRole) {
        const payments = await Payment.find({
            'receiver.user': userId,
            status: 'completed'
        });

        const totalRevenue = payments.reduce((sum, p) => sum + p.amount.total, 0);
        const platformCommission = payments.reduce((sum, p) => sum + (p.commission?.amount || 0), 0);
        const netRevenue = payments.reduce((sum, p) => sum + (p.commission?.receiverAmount || 0), 0);

        const settledAmount = payments
            .filter(p => p.settlement?.settled)
            .reduce((sum, p) => sum + (p.commission?.receiverAmount || 0), 0);

        const pendingSettlement = netRevenue - settledAmount;

        return {
            totalRevenue,
            platformCommission,
            netRevenue,
            settledAmount,
            pendingSettlement,
            totalTransactions: payments.length
        };
    }

    async settlePaymentsService(adminId, receiverId, paymentIds, bankReference) {
        const payments = await Payment.find({
            _id: { $in: paymentIds },
            'receiver.user': receiverId,
            status: 'completed',
            'settlement.settled': false
        });

        if (payments.length === 0) {
            throw new AppError(404, httpStatus.FAIL, 'No payments found to settle');
        }

        const totalAmount = payments.reduce(
            (sum, p) => sum + (p.commission?.receiverAmount || 0),
            0
        );

        const updatePromises = payments.map(payment => {
            payment.settlement = {
                settled: true,
                settledAt: new Date(),
                settledBy: adminId,
                bankTransferReference: bankReference
            };
            return payment.save();
        });

        await Promise.all(updatePromises);

        return {
            settledPayments: payments.length,
            totalAmount: totalAmount,
            bankReference: bankReference
        };
    }

    async refundPaymentService(paymentId, userId, refundPercentage, reason='No reason provided', options = {}) {
        const payment = await Payment.findById(paymentId);

        if (!payment) {
            throw new AppError(404, httpStatus.FAIL, 'Payment not found');
        }

        if (payment.status !== paymentConstants.STATUS.COMPLETED) {
            throw new AppError(400, httpStatus.FAIL, 'Only completed payments can be refunded');
        }

        if (payment.refund?.refundId) {
            throw new AppError(400, httpStatus.FAIL, 'Payment already refunded');
        }

        const refundResponse = await paymob.refundTransaction(payment.paymobTransactionId, refundPercentage, payment.amount.total);

        payment.status = paymentConstants.STATUS.REFUNDED_IN_PROCESS;
        payment.refund = {
            refundId: refundResponse.refundId,
            amount: Math.round(refundPercentage * payment.amount.total * 100) / 100,
            reason: reason,
            refundedAt: new Date(),
            refundedBy: userId
        };
        await payment.save(options);

        return payment.refund;
    }
    
}

module.exports = new PaymentService();