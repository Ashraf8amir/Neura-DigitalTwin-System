const asyncWrapper = require('../../shared/middlewares/asyncWrapper.middleware');
const Appointment = require('./appointment.model');
const { HTTP_STATUS_TEXT } = require('../../shared/constants/enums.js');
const ApiResponse = require('../../core/apiResponse');
const AppError = require('../../core/appError');
const service = require('./appointment.service');



/**
    * @desc    Get available time slots for a doctor on a specific date
    * @route   GET /api/v1/appointments/available-slots/:doctorId
    * @access  Private (Patients, Doctors, Admins)
    * @queryParams date (YYYY-MM-DD)
*/
exports.getAvailableSlots = asyncWrapper(async (req, res) => {
    const { doctorId } = req.params;
    const { date, clinicId, isTelemedicine } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (date < new Date().toLocaleDateString('en-CA'))) {
        throw new AppError(400, HTTP_STATUS_TEXT.BAD_REQUEST, 'Please provide a valid date in YYYY-MM-DD format');
    }

    if (isTelemedicine !== 'true' && !clinicId) {
        throw new AppError(400, HTTP_STATUS_TEXT.BAD_REQUEST, 'Clinic ID is required for in-person appointments');
    }

    const slots = await service.getAvailableSlots(
        doctorId,
        date,
        clinicId,
        isTelemedicine === 'true'
    );

    return new ApiResponse(
        res,
        200,
        HTTP_STATUS_TEXT.SUCCESS,
        'Available slots retrieved successfully',
        {
            date,
            totalAvailable: slots.length,
            slots
        }
    );
});
/**
    * @desc    Create a new appointment
    * @route   POST /api/v1/appointments
    * @access  Private (Patients and Admins)
*/
exports.createAppointment = asyncWrapper(async (req, res) => {
    const newAppointment = await service.createAppointment(req.body, req.user);

    return new ApiResponse(
        res,
        201,
        HTTP_STATUS_TEXT.SUCCESS,
        'Appointment created successfully',
        newAppointment
    );
});
/**
    * @desc    Get all appointments for the authenticated user
    * @route   GET /api/v1/appointments
    * @access  Private (Patients, Doctors, Admins)
    * @queryParams status, appointmentType, startDate, endDate, paymentStatus, 
                   priority, isEmergency, doctorId, patientId, page, limit, sortBy, sortOrder
*/
exports.getAllAppointments = asyncWrapper(async (req, res) => {
    const filters = {
        status: req.query.status,
        appointmentType: req.query.appointmentType,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        paymentStatus: req.query.paymentStatus,
        priority: req.query.priority,
        isEmergency: req.query.isEmergency,
        doctorId: req.query.doctorId,
        patientId: req.query.patientId
    };
    const options = {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        sortBy: req.query.sortBy || 'scheduledDate',
        sortOrder: req.query.sortOrder || 'desc'
    };

    const { data: appointments, pagination } = await service.getAllAppointments(req.user, filters, options);

    return new ApiResponse(
        res,
        200,
        HTTP_STATUS_TEXT.SUCCESS,
        'Appointments retrieved successfully',
        appointments,
        pagination
    );
});
/**
    * @desc    Get total count of appointments for the authenticated user
    * @route   GET /api/v1/appointments/count
    * @access  Private (Patients, Doctors, Admins)
*/
exports.countAppointments = asyncWrapper(async (req, res) => {
    const count = await service.countAppointments(req.user);

    return new ApiResponse(
        res,
        200,
        HTTP_STATUS_TEXT.SUCCESS,
        'Appointment count retrieved successfully',
        count
    );
})
/**
    * @desc    Get appointment statistics for the authenticated user
    * @route   GET /api/v1/appointments/statistics
    * @access  Private (Patients, Doctors, Admins)
*/
exports.getAppointmentStatistics = asyncWrapper(async (req, res) => {
    const period = req.query.period || 'month';
    const result = await service.getAppointmentStatistics(
        req.user.id,
        req.user.role,
        period
    );

    return new ApiResponse(
        res,
        200,
        HTTP_STATUS_TEXT.SUCCESS,
        'Appointment statistics retrieved successfully',
        result
    );
});
/**
    * @desc    Search appointments by appointment number
    * @route   GET /api/v1/appointments/search
    * @access  Private (Patients, Doctors, Admins)
    * @queryParams searchTerm, page, limit, sortOrder
*/
exports.searchAppointments = asyncWrapper(async (req, res) => {
    const { searchTerm } = req.query;
    const options = {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        sortOrder: req.query.sortOrder || 'desc'
    };

    const { data: results, pagination } = await service.searchAppointments(req.user.id, req.user.role, searchTerm, options);

    return new ApiResponse(
        res,
        200,
        HTTP_STATUS_TEXT.SUCCESS,
        'Search completed successfully',
        results,
        pagination
    );
});
/**
    * @desc    Get today's appointments for the authenticated user
    * @route   GET /api/v1/appointments/today
    * @access  Private (Doctors)
*/
exports.getTodayAppointments = asyncWrapper(async (req, res) => {
    const result = await service.getTodayAppointments(req.user.id);

    return new ApiResponse(
        res,
        200,
        HTTP_STATUS_TEXT.SUCCESS,
        'Today\'s appointments retrieved successfully',
        result
    );
});
/**
    * @desc    Get upcoming appointments for the authenticated user
    * @route   GET /api/v1/appointments/upcoming
    * @access  Private (Patients, Doctors, Admins)
    * @queryParams page, limit, daysAhead
*/
exports.getUpcomingAppointments = asyncWrapper(async (req, res) => {
    const options = {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        daysAhead : req.query.daysAhead || 15
    };
    const result = await service.getUpcomingAppointments(req.user.id, req.user.role, options);

    return new ApiResponse(
        res,
        200,
        HTTP_STATUS_TEXT.SUCCESS,
        'Upcoming appointments retrieved successfully',
        result
    );
});
/**
    * @desc    Get past appointments for the authenticated user
    * @route   GET /api/v1/appointments/past
    * @access  Private (Patients, Doctors, Admins)
    * @queryParams page, limit, daysBack
*/
exports.getPastAppointments = asyncWrapper(async (req, res) => {
    const options = {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        daysBack : req.query.daysBack || 30
    };
    const result = await service.getPastAppointments(req.user.id, req.user.role, options);
    
    return new ApiResponse(
        res,
        200,
        HTTP_STATUS_TEXT.SUCCESS,
        'Past appointments retrieved successfully',
        result
    );
});
/**
    * @desc    Reschedule an appointment
    * @route   POST /api/v1/appointments/:id/reschedule
    * @access  Private (Patients and Admins and Doctors )
    * @bodyParams newDate , newTime, reason, clinicId (required for in-person appointments)
*/
exports.rescheduleAppointment = asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const { newDate, newTime, reason, clinicId } = req.body;

    const updatedAppointment = await service.rescheduleAppointment(id, req.user.id, newDate, newTime, reason, clinicId);

    return new ApiResponse(
        res,
        200,
        HTTP_STATUS_TEXT.SUCCESS,
        'Appointment rescheduled successfully',
        updatedAppointment
    );
});
/**
    * @desc    Cancel an appointment
    * @route   POST /api/v1/appointments/:id/cancel
    * @access  Private (Patients and Admins and Doctors )
    * @bodyParams reason
*/
exports.cancelAppointment = asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const cancelled = await service.cancelAppointment(id, req.user.id, req.user.role, reason);

    return new ApiResponse(
        res,
        200,
        HTTP_STATUS_TEXT.SUCCESS,
        'Appointment cancelled successfully',
        cancelled.pointsAdded
    );
});