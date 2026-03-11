const mongoose = require('mongoose');
const Patient = require('../patients/patient.model');
const Doctor = require('../doctors/doctor.model');
const Appointment = require('./appointment.model');
const AppError = require('../../core/appError');
const { HTTP_STATUS_TEXT, ROLE, ACCOUNT_STATUS } = require('../../shared/constants/enums.js');
const AppointmentHelpers = require('./appointment.helper');
const logger = require('../../core/logger.js');
const { getPagination } = require('../../shared/utils/globalHelper.js');
const { appointmentConstants } = require('./appointment.constant');
const paymentService = require('../payments/payment.service');
const cloudinaryService = require('../../config/cloudinary');


class AppointmentService {

    statuses = appointmentConstants.APPOINTMENT_STATUSES;
    appointmentTypes = appointmentConstants.APPOINTMENT_TYPES;
    paymentStatuses = appointmentConstants.PAYMENT_STATUSES;

    async getAvailableSlots(doctorId, date, clinicId, isTelemedicine = false) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const dayName = startOfDay.toLocaleDateString('en-US', { weekday: 'long' });
        const isToday = new Date().toDateString() === startOfDay.toDateString();

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) throw new AppError(404, HTTP_STATUS_TEXT.NOT_FOUND, 'Doctor not found');

        let workingHours = [];
        let duration = 30;

        if (isTelemedicine) {
            workingHours = doctor.telemedicine.availableHours;
            duration = doctor.telemedicine.consultationDuration;
        } else {
            const clinic = doctor.clinicInfo.id(clinicId);
            if (!clinic) throw new AppError(404, HTTP_STATUS_TEXT.NOT_FOUND, 'Clinic not found');
            workingHours = clinic.availableHours;
            duration = clinic.consultationDuration;
        }

        const dayShifts = workingHours.filter(h => h.day === dayName);
        if (!dayShifts.length) return [];

        const query = {
            doctor: doctorId,
            scheduledDate: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: [this.statuses.PENDING, this.statuses.CONFIRMED] }
        };
        const existingAppointments = await Appointment.find(query).select('scheduledTime');

        let allSlots = [];
        dayShifts.forEach(shift => {
            const slots = AppointmentHelpers.calculateAvailableSlots(shift, existingAppointments, duration, isToday);
            allSlots = [...allSlots, ...slots];
        });

        return allSlots.sort((a, b) => a.localeCompare(b)); 
    }

    async createAppointment(appointmentData, user) {
        const { doctorId, clinicId } = appointmentData;

        const patientId = user.role === ROLE.PATIENT ? user.id : appointmentData.patientId;
        if (!patientId) {
            throw new AppError(400, HTTP_STATUS_TEXT.BAD_REQUEST, 'patientId is required when booking for a patient');
        }

        const session = await mongoose.startSession();

        try {

            let createdAppointment;

            await session.withTransaction(async () => {

                const [patient, doctor] = await Promise.all([
                    Patient.findById(patientId).session(session),
                    Doctor.findById(doctorId).session(session)
                ]);

                if (!patient) {
                    throw new AppError(404, HTTP_STATUS_TEXT.NOT_FOUND, 'Patient not found');
                }

                if (patient.blacklist?.isBlocked) {
                    const date = patient.blacklist.blockedUntil.toLocaleDateString();
                    throw new AppError(403, HTTP_STATUS_TEXT.FORBIDDEN, `Patient is blocked from booking appointments until ${date}`);
                }

                if (!doctor || doctor.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
                    throw new AppError(403, HTTP_STATUS_TEXT.FORBIDDEN, 'Doctor is not available or inactive');
                }

                const clinicInfo = doctor.clinicInfo?.id(clinicId);
                if (!clinicInfo) {
                    throw new AppError(404, HTTP_STATUS_TEXT.NOT_FOUND, 'Clinic not found for the doctor');
                }

                const isAvailable = await AppointmentHelpers.isTimeSlotAvailable(
                    doctorId,
                    clinicId,
                    appointmentData.scheduledDate,
                    appointmentData.scheduledTime.startTime,
                    appointmentData.scheduledTime.endTime,
                    session
                );

                if (!isAvailable) {
                    throw new AppError(409, HTTP_STATUS_TEXT.CONFLICT, 'Time slot is not available');
                }

                const consultationFee = AppointmentHelpers.calculateConsultationFee(appointmentData.appointmentType, clinicInfo, doctor);
                
                createdAppointment = await Appointment.create(
                    [{
                        doctor: doctorId,
                        patient: patientId,
                        scheduledDate: appointmentData.scheduledDate,
                        scheduledTime: appointmentData.scheduledTime,
                        appointmentType: appointmentData.appointmentType,
                        status: this.statuses.PENDING,
                        clinic: {
                            clinicId: clinicInfo._id,
                            clinicName: clinicInfo.clinicName,
                            address: clinicInfo.address,
                            location: clinicInfo.location
                        },
                        payment: {
                            consultationFee,
                            totalAmount: consultationFee,
                            method: appointmentData.paymentMethod,
                        },
                        priority: appointmentData.appointmentType === this.appointmentTypes.EMERGENCY ? 'urgent' : 'normal'
                    }],
                    { session }
                );
            });

            let paymentData = null;
            if (['card', 'wallet'].includes(appointmentData.paymentMethod)) {
                paymentData = await paymentService.initiateAppointmentPaymentService(
                    patientId,
                    createdAppointment[0]._id,
                    appointmentData.paymentMethod,
                    createdAppointment[0].payment.totalAmount,
                );
            }
        
            await createdAppointment[0].populate([
            { path: 'doctor', select: 'firstName lastName professionalInfo.primarySpecialization' },
            { path: 'patient', select: 'firstName lastName phone email dateOfBirth address' }
            ]);
        
        
            return {
                appointment: createdAppointment[0],
                paymentInitiated: !!paymentData,
                paymentUrl: paymentData?.iframeUrl
            };

        } catch (error) {
            logger.error('Error creating appointment', { error, doctorId, patientId });
            throw error;

        } finally {
            await session.endSession();
        }
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
            pagination: getPagination(total, page, limit)
        };

    }

    async countAppointments(user) {
        const baseQuery = {};

        if (user.role === ROLE.DOCTOR)  baseQuery.doctor = new mongoose.Types.ObjectId(user.id);
        else if (user.role === ROLE.PATIENT) baseQuery.patient = new mongoose.Types.ObjectId(user.id);

        const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
        const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
        const now = new Date();

        const stats = await Appointment.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    pending: { $sum: { $cond: [{ $eq: ["$status", this.statuses.PENDING] }, 1, 0] } },
                    confirmed: { $sum: { $cond: [{ $eq: ["$status", this.statuses.CONFIRMED] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $eq: ["$status", this.statuses.COMPLETED] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ["$status", this.statuses.CANCELLED] }, 1, 0] } },
                    today: { 
                        $sum: { 
                            $cond: [
                                { $and: [{ $gte: ["$scheduledDate", todayStart] }, { $lt: ["$scheduledDate", todayEnd] }] }, 1, 0
                            ] 
                        } 
                    },
                    upcoming: { 
                        $sum: { 
                            $cond: [
                                { $and: [ { $gte: ["$scheduledDate", now] }, { $in: ["$status", [this.statuses.PENDING, this.statuses.CONFIRMED]] } ]}, 1, 0
                            ] 
                        }
                    },
                    past: { $sum: { $cond: [{ $lt: ["$scheduledDate", now] }, 1, 0] } }
                }
            }
        ])
        const r = stats[0] || {
            total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0,
            today: 0, upcoming: 0, past: 0
        };

        return {
            total: r.total,
            byStatus: {
                    pending: r.pending,
                    confirmed: r.confirmed,
                    completed: r.completed,
                    cancelled: r.cancelled
                },
            byTime: {
                today: r.today,
                upcoming: r.upcoming,
                past: r.past
            }
        };

    }

    async getAppointmentStatistics(userId, userRole, period = 'month') {
        let startDate = new Date(new Date().setHours(0, 0, 0, 0));

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

                    pending: { $sum: { $cond: [{ $eq: ["$status", this.statuses.PENDING] }, 1, 0]}},
                    confirmed: { $sum: { $cond: [{ $eq: ["$status", this.statuses.CONFIRMED] }, 1, 0] } },
                    checkedIn: { $sum: { $cond: [{ $eq: ["$status", this.statuses.CHECKEDIN] }, 1, 0] } },
                    inProgress: { $sum: { $cond: [{ $eq: ["$status", this.statuses.INPROGRESS] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $eq: ["$status", this.statuses.COMPLETED] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ["$status", this.statuses.CANCELLED] }, 1, 0] } },

                    inPerson: { $sum: { $cond: [{ $eq: ["$appointmentType", this.appointmentTypes.IN_PERSON] }, 1, 0] } },
                    telemedicine: { $sum: { $cond: [{ $eq: ["$appointmentType", this.appointmentTypes.TELEMEDICINE] }, 1, 0] } },
                    followUp: { $sum: { $cond: [{ $eq: ["$appointmentType", this.appointmentTypes.FOLLOW_UP] }, 1, 0] } },
                    emergency: { $sum: { $cond: [{ $eq: ["$appointmentType", this.appointmentTypes.EMERGENCY] }, 1, 0] } },
                    consultation: { $sum: { $cond: [{ $eq: ["$appointmentType", this.appointmentTypes.CONSULTATION] }, 1, 0] } },

                    totalRevenue: { $sum: { $cond: [{ $eq: ["$payment.paymentStatus", this.paymentStatuses.PAID] }, "$payment.totalAmount", 0] } },
                    paidCount: { $sum: { $cond: [{ $eq: ["$payment.paymentStatus", this.paymentStatuses.PAID] }, 1, 0] } },
                    paymentPendingCount: { $sum: { $cond: [{ $eq: ["$payment.paymentStatus", this.paymentStatuses.PENDING] }, 1, 0] } },
                    paymentCancelledCount: { $sum: { $cond: [{ $eq: ["$payment.paymentStatus", this.paymentStatuses.CANCELLED] }, 1, 0] } },

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
                checkedIn: r.checkedIn || 0,
                inProgress: r.inProgress || 0,
                completed: r.completed || 0,
                cancelled: r.cancelled || 0,
                rescheduled: r.rescheduled || 0
            },
            byType: {
                inPerson: r.inPerson || 0,
                telemedicine: r.telemedicine || 0,
                followUp: r.followUp || 0,
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

        const { page = 1, limit = 10, sortOrder = 'desc' } = options;

        const baseQuery = {};
        if (userRole === ROLE.DOCTOR) baseQuery.doctor = user;
        else if (userRole === ROLE.PATIENT) baseQuery.patient = user;
        
        const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
        baseQuery.appointmentNumber = { $regex: escapedTerm, $options: 'i' };
        logger.info('Searching appointments', { userId: user, userRole, searchTerm, options });

        const skip = (page - 1) * limit;
        const sortOptions = { createdAt: sortOrder === 'asc' ? 1 : -1 };

        const [results, total] = await Promise.all([
            Appointment.find(baseQuery)
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
            Appointment.countDocuments(baseQuery)
        ]);

        const finalData = results.map(doc => AppointmentHelpers.formatAppointmentResponse(doc));

        return {
            data: finalData,
            pagination: getPagination(total, page, limit)
        };
    }

    async getTodayAppointments(doctorId) {
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
        const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

        const query = { 
            doctor: doctorId, 
            scheduledDate: { $gte: todayStart, $lt: todayEnd }, 
            status: { $nin: [this.statuses.CANCELLED] } 
        };

        const appointments = await Appointment.find(query)
            .sort({ scheduledDate: 1, 'scheduledTime.startTime': 1 })
            .lean()
            .populate([{ path: 'patient', select: 'firstName lastName phone email dateOfBirth address gender age' }]); 

        const grouped = appointments.reduce((acc, apt) => {
            if (acc[apt.status]) acc[apt.status].push(apt);
            return acc;
        }, { 
            [this.statuses.PENDING]: [], 
            [this.statuses.CONFIRMED]: [], 
            [this.statuses.CHECKEDIN]: [], 
            [this.statuses.INPROGRESS]: [], 
            [this.statuses.COMPLETED]: [] 
        });

        return {
            data: {
                summary: {
                    totalToday: appointments.length,
                    remaining: grouped[this.statuses.PENDING].length + grouped[this.statuses.CONFIRMED].length + grouped[this.statuses.CHECKEDIN].length,
                    done: grouped[this.statuses.COMPLETED].length
                },
                grouped
            }
        };
    }

    async getUpcomingAppointments(userId, role, options) {
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
        const futureDate = new Date(new Date().setDate(todayStart.getDate() + options.daysAhead));

        const query = {
            scheduledDate: { $gte: todayStart, $lte: futureDate }, 
            status: { $in: [this.statuses.PENDING, this.statuses.CONFIRMED, this.statuses.CHECKEDIN] }, 
        };

        if (role === ROLE.DOCTOR) query.doctor = userId;
        else if (role === ROLE.PATIENT) query.patient = userId;

        const skip = (options.page - 1) * options.limit;

        const appointments = await Appointment.find(query)
            .sort({ scheduledDate: 1, 'scheduledTime.startTime': 1 })
            .skip(skip)
            .limit(parseInt(options.limit))
            .lean()
            .populate([{ path: 'patient', select: 'firstName lastName phone email dateOfBirth address gender age' }]);

        const grouped = appointments.reduce((acc, apt) => {
            if (acc[apt.status]) acc[apt.status].push(apt);
            return acc;
        }, { 
            [this.statuses.PENDING]: [], 
            [this.statuses.CONFIRMED]: [], 
            [this.statuses.CHECKEDIN]: [], 
            [this.statuses.INPROGRESS]: [], 
            [this.statuses.COMPLETED]: [] 
        });

        return {
            data: {
                summary: {
                    totalUpcoming: appointments.length,
                    remaining: grouped[this.statuses.PENDING].length + grouped[this.statuses.CONFIRMED].length + grouped[this.statuses.CHECKEDIN].length,
                    done: grouped[this.statuses.COMPLETED].length
                },
                grouped
            },
            pagination: getPagination(appointments.length, options.page, options.limit)
        };
    }

    async getPastAppointments(userId, role, options) {
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
        const pastDate = new Date(new Date().setDate(todayStart.getDate() - options.daysBack));

        const query = {
            scheduledDate: { $lte: todayStart, $gte: pastDate }, 
            status: { $in: [this.statuses.COMPLETED, this.statuses.CANCELLED] }, 
        };

        if (role === ROLE.DOCTOR) query.doctor = userId;
        else if (role === ROLE.PATIENT) query.patient = userId;

        const skip = (options.page - 1) * options.limit;

        const appointments = await Appointment.find(query)
            .sort({ scheduledDate: -1, 'scheduledTime.startTime': -1 })
            .skip(skip)
            .limit(parseInt(options.limit))
            .lean()
            .populate([{ path: 'patient', select: 'firstName lastName phone email dateOfBirth address gender age' }]);

        const grouped = appointments.reduce((acc, apt) => {
            if (acc[apt.status]) acc[apt.status].push(apt);
            return acc;
        }, { 
            [this.statuses.COMPLETED]: [], 
            [this.statuses.CANCELLED]: [] 
        });

        return {
            data: {
                summary: {
                    totalPast: appointments.length,
                    completed: grouped[this.statuses.COMPLETED].length,
                    cancelled: grouped[this.statuses.CANCELLED].length
                },
                grouped
            },
            pagination: getPagination(appointments.length, options.page, options.limit)
        };
    }
    
    async rescheduleAppointment(appointmentId, userId, newDate, newTime, reason, newClinicId = null) {
        const session = await mongoose.startSession();

        try {
            const result = await session.withTransaction(async () => {
                const query = { 
                    _id: appointmentId, 
                    status: { $in: [this.statuses.PENDING, this.statuses.CONFIRMED] } 
                };

                const appointment = await Appointment.findOne(query).populate('doctor').session(session);
                if (!appointment) {
                    throw new AppError(404, HTTP_STATUS_TEXT.NOT_FOUND, 'Appointment not found or cannot be rescheduled');
                }

                if (!appointment.canBeRescheduled) {
                    throw new AppError(400, HTTP_STATUS_TEXT.BAD_REQUEST, 'This appointment cannot be rescheduled');
                }

                let clinicData = null;
                const clinicIdToUse = newClinicId || appointment.clinic?.clinicId;

                if (newClinicId && newClinicId.toString() !== appointment.clinic.clinicId.toString()) {
                    const clinicInfo = appointment.doctor.clinicInfo.id(newClinicId);
                    if (!clinicInfo) {
                        throw new AppError(404, HTTP_STATUS_TEXT.NOT_FOUND, 'New clinic not found for the doctor');
                    }
                    clinicData = {
                        clinicId: clinicInfo._id,
                        clinicName: clinicInfo.clinicName,
                        address: clinicInfo.address,
                        location: clinicInfo.location
                    };
                }

                const isAvailable = await AppointmentHelpers.isTimeSlotAvailable(
                    appointment.doctor._id || appointment.doctor,
                    clinicIdToUse,
                    new Date(newDate),
                    newTime.startTime,
                    newTime.endTime,
                    session,
                    appointmentId
                );
                if (!isAvailable) {
                    throw new AppError(409, HTTP_STATUS_TEXT.CONFLICT, 'New time slot is not available');
                }
                
                await appointment.reschedule(
                    userId,
                    new Date(newDate),
                    newTime,
                    reason,
                    { session, newClinicData: clinicData }
                );

                return appointment;
            });

            return result;
        } catch (error) {
            logger.error('Error rescheduling appointment', { error, appointmentId, userId });
            throw error;
        } finally {
            await session.endSession();
        }
    }
    async cancelAppointment(appointmentId, userId, role, reason) {
        const session = await mongoose.startSession();

        try {

            const result = await session.withTransaction(async () => {
                const query = { 
                    _id: appointmentId, 
                    status: { $in: [this.statuses.PENDING, this.statuses.CONFIRMED] } 
                };
                const appointment = await Appointment.findOne(query).session(session);
                if (!appointment) throw new AppError(404, 'NOT_FOUND', 'Appointment not found');

                const patientId = role === ROLE.PATIENT ? userId : appointment.patient;
                const patient = await Patient.findById(patientId).session(session);

                if (!patient) throw new AppError(404, 'NOT_FOUND', 'Patient not found');

                const refundPercentage = AppointmentHelpers.calculateRefundPercentage(appointment.scheduledDate, role);

                let refundDetails = null;
                // if (appointment.payment.paid && refundPercentage > 0) {
                //     refundDetails = await paymentService.refundPaymentService(
                //         appointment.payment._id, 
                //         userId, 
                //         refundPercentage, 
                //         reason, 
                //         { session }
                //     );
                // }

                await appointment.cancel(userId, role, reason, patient, refundPercentage, { session });

                return {
                    pointsSummary: {
                        currentPoints: patient.blacklist.blacklistPoints,
                        isBlocked: patient.blacklist.isBlocked,
                        blockedUntil: patient.blacklist.blockedUntil
                    },
                    refundSummary: refundDetails ? {
                        status: 'INITIATED',
                        amount: refundDetails.amount,
                        refundId: refundDetails.refundId
                    } : { status: 'NONE', amount: 0 }   
                };                
            });

            return result;

        } catch (error) {
            logger.error('Error cancelling appointment', { error, appointmentId, userId, role });
            throw error;
        } finally {
            await session.endSession();
        }
    }

    async updatePatientVisitInfo(appointmentId, userId, patientProvidedInfo = {}, filesData = []) {
        const query = { 
            _id: appointmentId, 
            status: { $in: [this.statuses.PENDING, this.statuses.CONFIRMED] } 
        };
        const appointment = await Appointment.findOne(query);
        if (!appointment) {
            throw new AppError(404, HTTP_STATUS_TEXT.NOT_FOUND, 'Appointment not found');
        }

        if (appointment.patient.toString() !== userId.toString()) {
            throw new AppError(403, HTTP_STATUS_TEXT.FORBIDDEN, 'You are not authorized to update this appointment');
        }


        const incomingInfo = (patientProvidedInfo && typeof patientProvidedInfo === 'object') ? patientProvidedInfo : {};
        const normalizedFiles = Array.isArray(filesData) ? filesData : [];

        const uploadedAttachments = [];
        for (let index = 0; index < normalizedFiles.length; index++) {
            const fileItem = normalizedFiles[index];

            const uploadResult = await cloudinaryService.uploadDocumentToCloudinary(
                fileItem.buffer,
                fileItem.originalname,
                fileItem.mimetype,
                {
                    folder: `appointments/${appointmentId}/visit-info`,
                    publicId: `visit-attachment-${appointmentId}-${Date.now()}-${index}`
                }
            );

            uploadedAttachments.push({
                fileName: uploadResult.filename,
                fileUrl: uploadResult.url,
                uploadedBy: userId,
                uploadedAt: new Date()
            });
        }

        appointment.patientProvidedInfo = {
            ...incomingInfo,
            attachments: uploadedAttachments
        };

        await appointment.save();

        return appointment;
    }
}
module.exports = new AppointmentService();