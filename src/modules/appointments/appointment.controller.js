const asyncWrapper = require('../../shared/middlewares/asyncWrapper.middleware');
const Appointment = require('./appointment.model');
const { HTTP_STATUS_TEXT } = require('../../shared/constants/enums.js');
const ApiResponse = require('../../core/apiResponse');
const service = require('./appointment.service');


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
    * @desc    Search appointments with advanced filters
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

