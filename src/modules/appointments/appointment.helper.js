const Appointment = require('./appointment.model');
const AppError = require('../../core/appError');
const { HTTP_STATUS_TEXT } = require('../../shared/constants/enums.js');
const { ROLE } = require('../../shared/constants/enums.js');


class AppointmentHelpers {


    static async isTimeSlotAvailable(doctorId, date, startTime, endTime, excludeAppointmentId = null) {
        const query = {
          doctor: doctorId,
          scheduledDate: date,
          status: { $nin: ['cancelled', 'no-show'] },
          'scheduledTime.startTime': { $lt: endTime },
          'scheduledTime.endTime': { $gt: startTime }
        };

        if (excludeAppointmentId) {
          query._id = { $ne: excludeAppointmentId };
        }

        const conflictingAppointment = await Appointment.findOne(query);
        return !conflictingAppointment;
    }
    static async sendAppointmentConfirmation(appointment) {
        try {
            // Send SMS
            if (appointment.patient.phone) {
                await sendSMS(
                    appointment.patient.phone,
                    `تم حجز موعدك مع د. ${appointment.doctor.firstName} ${appointment.doctor.lastName} يوم ${appointment.scheduledDate.toLocaleDateString('ar-EG')} الساعة ${appointment.scheduledTime.startTime}`
                );
            }
          
            // Send Email
            if (appointment.patient.email) {
                await sendEmail(
                    appointment.patient.email,
                    'Appointment Confirmation',
                    appointmentConfirmationTemplate(appointment)
                );
            }
          
            // Log reminder in appointment
            await Appointment.findByIdAndUpdate(appointment._id, {
                $push: {
                    reminders: {
                        type: 'sms',
                        sentAt: new Date(),
                        status: 'sent'
                    }
                }
            });
        } catch (error) {
            console.error('Notification error:', error);
            // Don't throw - notification failure shouldn't fail appointment creation
        }
    }
    static buildQueryByRole(user, filters) {
        const query = {};
    
        if (user.role === ROLE.DOCTOR) {
            query.doctor = user.id;
        } else if (user.role === ROLE.PATIENT) {
            query.patient = user.id;
        }
      
        if (filters.status) {
            query.status = filters.status;
        }
      
        if (filters.appointmentType) {
            query.appointmentType = filters.appointmentType;
        }
      
        if (filters.startDate && filters.endDate) {
            query.scheduledDate = {
                $gte: new Date(filters.startDate),
                $lte: new Date(filters.endDate)
            };
        } else if (filters.startDate) {
            query.scheduledDate = { $gte: new Date(filters.startDate) };
        } else if (filters.endDate) {
            query.scheduledDate = { $lte: new Date(filters.endDate) };
        }
      
        if (filters.paymentStatus) {
            query['payment.paymentStatus'] = filters.paymentStatus;
        }
      
        if (filters.priority) {
            query.priority = filters.priority;
        }
      
        if (filters.isEmergency !== undefined) {
            query.isEmergency = filters.isEmergency === 'true';
        }
      
        if (filters.doctorId && user.role !== ROLE.DOCTOR) {
            query.doctor = filters.doctorId;
        }
      
        if (filters.patientId && user.role !== ROLE.PATIENT) {
            query.patient = filters.patientId;
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

      const fieldsToDelete = ['_id', '__v', 'isDeleted', 'deletedAt', 'deletedBy', 'createdAt', 'updatedAt'];
      fieldsToDelete.forEach(field => delete appointment[field]);

      return appointment;
    }
}

module.exports = AppointmentHelpers;