const Appointment = require('./appointment.model');
const { ROLE } = require('../../shared/constants/enums.js');
const { appointmentConstants } = require('./appointment.constant');


class AppointmentHelpers {

    
    static async isTimeSlotAvailable(doctorId, clinicId, date, startTime, endTime, session = null, excludeAppointmentId = null) {
        const query = {
            doctor: doctorId,
            "clinic.clinicId": clinicId,
            scheduledDate: date,
            status: { $in: [appointmentConstants.APPOINTMENT_STATUSES.PENDING, appointmentConstants.APPOINTMENT_STATUSES.CONFIRMED] },
            'scheduledTime.startTime': { $lt: endTime },
            'scheduledTime.endTime': { $gt: startTime }
        };

        if (excludeAppointmentId) {
            query._id = { $ne: excludeAppointmentId };
        }

        const conflictingAppointment = await Appointment.findOne(query).session(session);
        return !conflictingAppointment;
    }
    static calculateConsultationFee(appointmentType, clinicInfo, doctor) {
        let consultationFee = 0;
            switch (appointmentType) {
                case appointmentConstants.APPOINTMENT_TYPES.FOLLOW_UP:
                    consultationFee = clinicInfo.followUpFee || 0;
                    break;
                case appointmentConstants.APPOINTMENT_TYPES.TELEMEDICINE:
                    consultationFee = doctor.telemedicine?.consultationFee || clinicInfo.consultationFee || 0;
                    break;
                case appointmentConstants.APPOINTMENT_TYPES.CONSULTATION:
                default:
                    consultationFee = clinicInfo.consultationFee || 0;
                    break;
            }
        return consultationFee;
    }
    static buildQueryByRole(user, filters) {
        const query = {};
    
        const roleMapping = {
            [ROLE.DOCTOR]: 'doctor',
            [ROLE.PATIENT]: 'patient'
        };

        if (roleMapping[user.role]) {
            query[roleMapping[user.role]] = user.id;
        }

        const filterMaps = {
            status: 'status',
            appointmentType: 'appointmentType',
            paymentStatus: 'payment.paymentStatus',
            priority: 'priority',
            doctorId: user.role !== ROLE.DOCTOR ? 'doctor' : null,
            patientId: user.role !== ROLE.PATIENT ? 'patient' : null
        };

        Object.entries(filterMaps).forEach(([filterKey, dbPath]) => {
            if (dbPath && filters[filterKey]) {
                query[dbPath] = filters[filterKey];
            }
        });
      
        if (filters.startDate || filters.endDate) {
            query.scheduledDate = {};
            if (filters.startDate) query.scheduledDate.$gte = new Date(filters.startDate);
            if (filters.endDate) query.scheduledDate.$lte = new Date(filters.endDate);
        }
      
        if (filters.isEmergency !== undefined) {
            query.isEmergency = String(filters.isEmergency) === 'true';
        }
      
        return query;
    }
    static formatAppointmentResponse(doc) {
      const appointment = doc.toObject ? doc.toObject() : { ...doc };

      if (appointment.doctor && typeof appointment.doctor === 'object') {
          appointment.doctor = {
              id: appointment.doctor._id || appointment.doctor.id,
              firstName: appointment.doctor.firstName,
              lastName: appointment.doctor.lastName,
              fullName: `${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
              primarySpecialization: appointment.doctor.professionalInfo?.primarySpecialization
          };
      }

      if (appointment.patient && typeof appointment.patient === 'object') {
          const dob = appointment.patient.dateOfBirth;
          appointment.patient = {
              id: appointment.patient._id || appointment.patient.id,
              firstName: appointment.patient.firstName,
              lastName: appointment.patient.lastName,
              fullName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
              phone: appointment.patient.phone,
              address: appointment.patient.address,
              age: dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null
          };
      }

      const fieldsToDelete = ['__v', 'isDeleted', 'deletedAt', 'deletedBy', 'createdAt', 'updatedAt'];
      fieldsToDelete.forEach(field => delete appointment[field]);

      return appointment;
    }
    static calculateAvailableSlots(shift, appointments, duration, isToday) {
        const slots = [];

        const toMins = (t) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };

        let startMins = toMins(shift.startTime);
        const endMins = toMins(shift.endTime);

        if (isToday) {
            const now = new Date();
            const currentMins = now.getHours() * 60 + now.getMinutes() + 30; 
            if (currentMins > startMins) startMins = currentMins;
        }

        const booked = appointments.map(a => ({
            s: toMins(a.scheduledTime.startTime),
            e: toMins(a.scheduledTime.endTime)
        }));

        for (let time = startMins; time + duration <= endMins; time += duration) {
            const isConflict = booked.some(b => (time < b.e && time + duration > b.s));

            if (!isConflict) {
                const h = Math.floor(time / 60).toString().padStart(2, '0');
                const m = (time % 60).toString().padStart(2, '0');
                slots.push(`${h}:${m}`);
            }
        }
        return slots;
    }
    static calculateRefundPercentage(scheduledDate, role) {
        const hoursDifference = (scheduledDate - new Date()) / (1000 * 60 * 60);
        let refundPercentage = 0;

        if (role === 'doctor') {
            refundPercentage = 1;
        } else if (hoursDifference >= 12) {
            refundPercentage = 1;
        } else if (hoursDifference < 12 && hoursDifference > 1) {
            refundPercentage = 0.5;
        }

        return refundPercentage;
    }
    static async handlePointDecay(userDocument, options = {}) {
        userDocument.blacklist.consecutiveSuccessiveAppointments += 1;

        if (userDocument.blacklist.consecutiveSuccessiveAppointments >= 3) {
          userDocument.blacklist.blacklistPoints = Math.max(0, userDocument.blacklist.blacklistPoints - 2);
        
          userDocument.blacklist.consecutiveSuccessiveAppointments = 0;
        }
    
        await userDocument.save(options);
    }
}

module.exports = AppointmentHelpers;