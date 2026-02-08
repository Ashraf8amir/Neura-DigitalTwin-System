const Patient = require('../patients/patient.model');
const Doctor = require('../doctors/doctor.model');
const Appointment = require('./appointment.model');
const AppError = require('../../core/appError');
const { HTTP_STATUS_TEXT, ROLE, ACCOUNT_STATUS } = require('../../shared/constants/enums.js');
const AppointmentHelpers = require('./appointment.helper');
const logger = require('../../core/logger.js');
const mongoose = require('mongoose');


class AppointmentService {

    async createAppointment(appointmentData, user) {
        const { doctorId, clinic, ...rest } = appointmentData;

        const patientId = user.role === ROLE.PATIENT ? user.id : appointmentData.patientId;

        if (!patientId) {
            throw new AppError(400, HTTP_STATUS_TEXT.BAD_REQUEST, 'patientId is required when booking for a patient');
        }

        const [patient, doctor] = await Promise.all([
            Patient.findById(patientId),
            Doctor.findById(doctorId)
        ])

        if (!patient) {
            throw new AppError(404, HTTP_STATUS_TEXT.NOT_FOUND, 'Patient not found');
        }

        if ([ACCOUNT_STATUS.SUSPENDED, ACCOUNT_STATUS.INCOMPLETE].includes(patient.accountStatus)) {
            throw new AppError(403, HTTP_STATUS_TEXT.FORBIDDEN, 'Patient is not allowed to book appointments');
        }

        if (!doctor || doctor.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
            throw new AppError(403, HTTP_STATUS_TEXT.FORBIDDEN, 'Doctor is not available or inactive');
        }

        if(appointmentData.appointmentType === 'telemedicine' && !doctor.telemedicine?.enabled) {
            throw new AppError(400, HTTP_STATUS_TEXT.BAD_REQUEST, 'Doctor does not offer telemedicine appointments');
        }
        
         const isAvailable = await AppointmentHelpers.isTimeSlotAvailable(
            doctorId,
            appointmentData.scheduledDate,
            appointmentData.scheduledTime.startTime,
            appointmentData.scheduledTime.endTime
        );

        if (!isAvailable) {
            throw new AppError(409, HTTP_STATUS_TEXT.CONFLICT, 'Time slot is not available');
        }

        const clinicInfo = doctor.clinicInfo?.id(clinic?.clinicId);
        if (!clinicInfo) {
            throw new AppError(404, HTTP_STATUS_TEXT.NOT_FOUND, 'Clinic not found for the doctor');
        }

        const appointmentLocation  = {
            clinicId: clinic.clinicId,
            clinicName: clinicInfo.clinicName,
            address: clinicInfo.address,
            location: clinicInfo.location
        };

        const newAppointment = new Appointment({
            ...rest,
            doctor: doctorId,
            patient: patientId,
            status: 'pending',
            clinic: appointmentLocation,
            priority: appointmentData.appointmentType === 'emergency' ? 'urgent' : 'normal'
        });

        await newAppointment.save();
        await newAppointment.populate([
            {
                path: 'doctor',
                select: 'firstName lastName professionalInfo.primarySpecialization'
            },
            {
                path: 'patient',
                select: 'firstName lastName phone email dateOfBirth address'
            }
        ]);

        logger.info('Appointment created', {
            appointmentId: newAppointment._id,
            doctorId,
            patientId,
            duration: Date.now() - startTime
        });

        return newAppointment;
    };
    async getAllAppointments(user, filters = {}, options = {}) {
        const {
            page = 1,
            limit = 10,
            sortBy = 'scheduledDate',
            sortOrder = 'desc',
        } = options;

        const query = AppointmentHelpers.buildQueryByRole(user, filters);

        const skip = (page - 1) * limit;
        const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        let appointmentsQuery = Appointment.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .lean()
            .populate([
                {
                    path: 'doctor',
                    select: 'firstName lastName professionalInfo.primarySpecialization'
                },
                {
                    path: 'patient',
                    select: 'firstName lastName phone email dateOfBirth address'
                }
            ]);

        const [appointments, total] = await Promise.all([
            appointmentsQuery,
            Appointment.countDocuments(query)
        ]);

        const finalData = appointments.map(doc => AppointmentHelpers.formatAppointmentResponse(doc));

        return {
            data: finalData,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPrevPage: page > 1
            }
        };

    }
    async countAppointments(user) {
        const baseQuery = {};

        if (user.role === ROLE.DOCTOR) {
            baseQuery.doctor = user.id;
        } else if (user.role === ROLE.PATIENT) {
            baseQuery.patient = user.id;
        }

        const [
            total,
            pending,
            confirmed,
            completed,
            cancelled,
            today,
            upcoming,
            past
        ] = await Promise.all([
            Appointment.countDocuments(baseQuery),
            Appointment.countDocuments({ ...baseQuery, status: 'pending' }),
            Appointment.countDocuments({ ...baseQuery, status: 'confirmed' }),
            Appointment.countDocuments({ ...baseQuery, status: 'completed' }),
            Appointment.countDocuments({ ...baseQuery, status: 'cancelled' }),
            Appointment.countDocuments({
                ...baseQuery,
                scheduledDate: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    $lt: new Date(new Date().setHours(23, 59, 59, 999))
                }
            }),
            Appointment.countDocuments({
                ...baseQuery,
                scheduledDate: { $gte: new Date() },
                status: { $in: ['pending', 'confirmed'] }
            }),
            Appointment.countDocuments({
                ...baseQuery,
                scheduledDate: { $lt: new Date() }
            })
        ]);

        return {
            total,
            byStatus: {
                    pending,
                    confirmed,
                    completed,
                    cancelled
                },
            byTime: {
                today,
                upcoming,
                past
            }
        };

    }
    async getAppointmentStatistics(userId, userRole, period = 'month') {
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        switch (period) {
            case 'today': break;
            case 'week': startDate.setDate(startDate.getDate() - 7); break;
            case 'month': startDate.setMonth(startDate.getMonth() - 1); break;
            case 'year': startDate.setFullYear(startDate.getFullYear() - 1); break;
            case 'all': startDate = new Date('2000-01-01'); break;
            default: throw new AppError(400, HTTP_STATUS_TEXT.BAD_REQUEST, 
                'Invalid period value. Valid values are: today, week, month, year, all'
            );
        }

        const query = { createdAt: { $gte: startDate }};
        if (userRole === ROLE.DOCTOR) query.doctor = new mongoose.Types.ObjectId(userId);
        else if (userRole === ROLE.PATIENT) query.patient = new mongoose.Types.ObjectId(userId);

        const statsArray = await Appointment.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },

                    pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0]}},
                    confirmed: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
                    checkedIn: { $sum: { $cond: [{ $eq: ["$status", "checked-in"] }, 1, 0] } },
                    inProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                    rescheduled: { $sum: { $cond: [{ $eq: ["$status", "rescheduled"] }, 1, 0] } },

                    inPerson: { $sum: { $cond: [{ $eq: ["$appointmentType", "in-person"] }, 1, 0] } },
                    telemedicine: { $sum: { $cond: [{ $eq: ["$appointmentType", "telemedicine"] }, 1, 0] } },
                    followUp: { $sum: { $cond: [{ $eq: ["$appointmentType", "follow-up"] }, 1, 0] } },
                    emergency: { $sum: { $cond: [{ $eq: ["$appointmentType", "emergency"] }, 1, 0] } },
                    consultation: { $sum: { $cond: [{ $eq: ["$appointmentType", "consultation"] }, 1, 0] } },

                    totalRevenue: { $sum: { $cond: [{ $eq: ["$payment.paymentStatus", "paid"] }, "$payment.totalAmount", 0] } },
                    paidCount: { $sum: { $cond: [{ $eq: ["$payment.paymentStatus", "paid"] }, 1, 0] } },
                    paymentPendingCount: { $sum: { $cond: [{ $eq: ["$payment.paymentStatus", "pending"] }, 1, 0] } },
                    paymentCancelledCount: { $sum: { $cond: [{ $eq: ["$payment.paymentStatus", "cancelled"] }, 1, 0] } },

                    avgRating: { $avg: "$review.rating" },
                    ratingCount: { $sum: { $cond: [{ $gt: ["$review.rating", 0] }, 1, 0] } },
                    star1: { $sum: { $cond: [{ $eq: ["$review.rating", 1] }, 1, 0] } },
                    star2: { $sum: { $cond: [{ $eq: ["$review.rating", 2] }, 1, 0] } },
                    star3: { $sum: { $cond: [{ $eq: ["$review.rating", 3] }, 1, 0] } },
                    star4: { $sum: { $cond: [{ $eq: ["$review.rating", 4] }, 1, 0] } },
                    star5: { $sum: { $cond: [{ $eq: ["$review.rating", 5] }, 1, 0] } }
                }                
            }
        ])

        const r = statsArray[0] || {};

        const finalStats = {
        total: r.total || 0,
            byStatus: {
                pending: r.pending || 0,
                confirmed: r.confirmed || 0,
                'checked-in': r.checkedIn || 0,
                'in-progress': r.inProgress || 0,
                completed: r.completed || 0,
                cancelled: r.cancelled || 0,
                rescheduled: r.rescheduled || 0
            },
            byType: {
                'in-person': r.inPerson || 0,
                telemedicine: r.telemedicine || 0,
                'follow-up': r.followUp || 0,
                emergency: r.emergency || 0,
                consultation: r.consultation || 0
            },
            payment: {
                totalRevenue: r.totalRevenue || 0,
                paid: r.paidCount || 0,
                pending: r.paymentPendingCount || 0,
                cancelled: r.paymentCancelledCount || 0
            },
            ratings: {
                average: Number((r.avgRating || 0).toFixed(2)),
                total: r.ratingCount || 0,
                breakdown: { 1: r.star1 || 0, 2: r.star2 || 0, 3: r.star3 || 0, 4: r.star4 || 0, 5: r.star5 || 0 }
            }
        };

        const calculateRate = (val) => finalStats.total > 0 ? Number(((val / finalStats.total) * 100).toFixed(2)) : 0 ;

        finalStats.completionRate = calculateRate(finalStats.byStatus.completed);
        finalStats.cancellationRate = calculateRate(finalStats.byStatus.cancelled);

        return { finalStats , period };
    }
    async searchAppointments(user, userRole, searchTerm, options = {}) {
        if (!searchTerm || searchTerm.trim() === '') {
            throw new AppError(400, HTTP_STATUS_TEXT.BAD_REQUEST, 'searchTerm query parameter is required');
        }

        const {
            page = 1,
            limit = 10,
            sortOrder = 'desc'
        } = options;

        const baseQuery = {};
        if (userRole === ROLE.DOCTOR) baseQuery.doctor = user.id;
        else if (userRole === ROLE.PATIENT) baseQuery.patient = user.id;
        
        const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
        const searchQuery = {
            ...baseQuery,
            $or: [
                { appointmentNumber: { $regex: escapedTerm, $options: 'i' } },
                { reasonForVisit: { $regex: escapedTerm, $options: 'i' } },
                { 'notes.patientNotes': { $regex: escapedTerm, $options: 'i' } }
            ]
        };

        const skip = (page - 1) * limit;
        const sortOptions = { createdAt: sortOrder === 'asc' ? 1 : -1 };

        const [results, total] = await Promise.all([
            Appointment.find(searchQuery)
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .lean()
                .populate([
                    {
                        path: 'doctor',
                        select: 'firstName lastName professionalInfo.primarySpecialization'
                    },
                    {
                        path: 'patient',
                        select: 'firstName lastName phone email dateOfBirth address'
                    }
                ]),
            Appointment.countDocuments(searchQuery)
        ]);

        const finalData = results.map(doc => AppointmentHelpers.formatAppointmentResponse(doc));

        return {
            data: finalData,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPrevPage: page > 1
            }
        };
    }


}

module.exports = new AppointmentService();