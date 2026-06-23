const cacheService = require('../../cache/cache.service');
const cacheTTL = require('../../cache/redis.ttl');
const { buildCacheKey, hashQuery, normalizePart } = require('../../cache/cache.keys');

const getAvailableSlotsKey = ({ doctorId, date, clinicId, isTelemedicine }) => {
    const dateToken = date ? new Date(date).toISOString().slice(0, 10) : 'na';
    return buildCacheKey(
        'appointments',
        'slots',
        'doctor',
        doctorId,
        'date',
        dateToken,
        'clinic',
        clinicId || 'na',
        'tele',
        isTelemedicine ? 1 : 0
    );
};

const getAppointmentsListKey = ({ userId, role, filters, options }) => {
    const prefix = buildCacheKey('appointments', 'list', 'user', userId, 'role', role);
    const queryHash = hashQuery({ filters, options });
    return `${prefix}:q:${queryHash}`;
};

const getAppointmentCountKey = ({ userId, role }) => buildCacheKey('appointments', 'count', 'user', userId, 'role', role);

const getAppointmentStatisticsKey = ({ userId, role, period }) => buildCacheKey('appointments', 'stats', 'user', userId, 'role', role, 'period', period);

const getTodayAppointmentsKey = ({ doctorId }) => buildCacheKey('appointments', 'today', 'doctor', doctorId);

const getPatientBriefKey = ({ appointmentId, doctorId }) => buildCacheKey('appointments', 'brief', 'appointment', appointmentId, 'doctor', doctorId);

const getUserListPrefix = (userId) => buildCacheKey('appointments', 'list', 'user', userId);

const getUserCountPrefix = (userId) => buildCacheKey('appointments', 'count', 'user', userId);

const getUserStatsPrefix = (userId) => buildCacheKey('appointments', 'stats', 'user', userId);

const getDoctorTodayPrefix = (doctorId) => buildCacheKey('appointments', 'today', 'doctor', doctorId);

const getDoctorSlotsPrefix = (doctorId) => buildCacheKey('appointments', 'slots', 'doctor', doctorId);

const getBriefByAppointmentPrefix = (appointmentId) => buildCacheKey('appointments', 'brief', 'appointment', appointmentId);

const clearUserAppointmentsCache = async (userId) => {
    if (!userId) return;
    await Promise.all([
        cacheService.delByPrefix(getUserListPrefix(normalizePart(userId))),
        cacheService.delByPrefix(getUserCountPrefix(normalizePart(userId))),
        cacheService.delByPrefix(getUserStatsPrefix(normalizePart(userId)))
    ]);
};

const clearDoctorAppointmentsCache = async (doctorId) => {
    if (!doctorId) return;
    const normalizedDoctorId = normalizePart(doctorId);

    await Promise.all([
        clearUserAppointmentsCache(normalizedDoctorId),
        cacheService.delByPrefix(getDoctorTodayPrefix(normalizedDoctorId)),
        cacheService.delByPrefix(getDoctorSlotsPrefix(normalizedDoctorId))
    ]);
};

const clearPatientBriefCache = async (appointmentId, doctorId = null) => {
    if (!appointmentId) return;

    if (doctorId) {
        await cacheService.delKey(getPatientBriefKey({ appointmentId, doctorId }));
        return;
    }

    await cacheService.delByPrefix(getBriefByAppointmentPrefix(appointmentId));
};

const clearAppointmentScopedCache = async ({ appointmentId, doctorId, patientId }) => {
    await Promise.all([
        clearPatientBriefCache(appointmentId, doctorId),
        clearDoctorAppointmentsCache(doctorId),
        clearUserAppointmentsCache(patientId)
    ]);
};

module.exports = {
    ttl: cacheTTL.appointments,
    getAvailableSlotsKey,
    getAppointmentsListKey,
    getAppointmentCountKey,
    getAppointmentStatisticsKey,
    getTodayAppointmentsKey,
    getPatientBriefKey,
    clearUserAppointmentsCache,
    clearDoctorAppointmentsCache,
    clearPatientBriefCache,
    clearAppointmentScopedCache
};