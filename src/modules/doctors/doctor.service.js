const Doctor = require('./doctor.model');
const AppError = require('../../core/appError');
const httpStatus = require('../../core/httpStatus');
const doctorHelper = require('./doctor.helper')
const cloudinaryService = require('../../config/cloudinary');


class DoctorService {

    selectBasicFields = 'firstName lastName fullName email phone \
        dateOfBirth gender age role address nationality profileImage';

    async getDoctorById(doctorId, selectFields ='') {
        const query = Doctor.findById(doctorId);
        if (selectFields) query.select(selectFields);

        const doctor =  await query;
        if (!doctor) throw new AppError(404, httpStatus.FAIL, 'Doctor not found');

        return doctor;
    };

    async getDoctorBasicInfo(doctorId) {
        return this.getDoctorById(doctorId, this.selectBasicFields);
    };
    async updateDoctorBasicInfo(doctorId, updateData){
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select(this.selectBasicFields);

        if (!doctor) throw new AppError(404, httpStatus.FAIL, 'Doctor not found');

        return doctor;
    };

    async getDoctorProfessionalInfo(doctorId) {
        const doctor = await Doctor.findById(doctorId)
        
        if (!doctor) throw new AppError(404, httpStatus.FAIL, 'Doctor not found');

        return doctor.professionalInfo;
    };
    async updateDoctorProfessionalInfo(doctorId, updateData){
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            { $set: { professionalInfo: updateData } },
            { new: true, runValidators: true }
        );

        if (!doctor) throw new AppError(404, httpStatus.FAIL, 'Doctor not found');

        return doctor.professionalInfo;
    };
    async addDoctorCertificate(doctorId, certificateData, certificateFile){
        const doctor = await this.getDoctorById(doctorId);

        if (certificateFile) {
            const uploadResult = await cloudinaryService.uploadDocumentToCloudinary(
                certificateFile.buffer,
                certificateFile.originalname,
                certificateFile.mimetype,
                {
                    folder: `doctors/certificates`,
                    publicId: `certificate-${doctorId}-${Date.now()}`
                }
            );
            certificateData.url = uploadResult.url;
        }

        doctor.professionalInfo.certificates.push(certificateData);
        await doctor.save();

        return doctor.professionalInfo.certificates[doctor.professionalInfo.certificates.length - 1];
    };
    async deleteDoctorCertificate(doctorId, certificateId){
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            { $pull: { 'professionalInfo.certificates': { _id: certificateId } } },
            { new: true }
        );

        if (!doctor) throw new AppError(404, httpStatus.FAIL, 'Doctor not found');

        return { IDDeleted: certificateId };
    };
    async addDoctorMembership(doctorId, membershipData){
        const doctor = await this.getDoctorById(doctorId);

        doctor.professionalInfo.medicalMemberships.push(membershipData);
        await doctor.save();

        return doctor.professionalInfo.medicalMemberships[doctor.professionalInfo.medicalMemberships.length - 1];
    };
    async deleteDoctorMembership(doctorId, membershipId){
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            { $pull: { 'professionalInfo.medicalMemberships': { _id: membershipId } } },
            { new: true }
        );

        if (!doctor) throw new AppError(404, httpStatus.FAIL, 'Doctor not found');

        return { IDDeleted: membershipId };
    };
    async addDoctorAward(doctorId, awardData, awardFile){
        const doctor = await this.getDoctorById(doctorId);

        if (awardFile) {
            const uploadResult = await cloudinaryService.uploadDocumentToCloudinary(
                awardFile.buffer,
                awardFile.originalname,
                awardFile.mimetype,
                {
                    folder: `doctors/awards`,
                    publicId: `award-${doctorId}-${Date.now()}`
                }
            );
            awardData.url = uploadResult.url;
        }

        doctor.professionalInfo.awards.push(awardData);
        await doctor.save();

        return doctor.professionalInfo.awards[doctor.professionalInfo.awards.length - 1];
    };
    async deleteDoctorAward(doctorId, awardId){
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            { $pull: { 'professionalInfo.awards': { _id: awardId } } },
            { new: true }
        );

        if (!doctor) throw new AppError(404, httpStatus.FAIL, 'Doctor not found');

        return { IDDeleted: awardId };
    };

    async getDoctorClinicInfo(doctorId) {
        const doctor = await this.getDoctorById(doctorId);

        return doctor.clinicInfo;
    };
    async setDoctorClinicInfo(doctorId, clinicInfoData){
        const doctor = await this.getDoctorById(doctorId);

        doctor.clinicInfo.push(clinicInfoData);
        await doctor.save();    

        return doctor.clinicInfo[doctor.clinicInfo.length - 1];
    };
    async updateDoctorClinicInfo(doctorId, clinicId, updateData){
        const updatedFields = doctorHelper.buildPatchUpdate({ 
                    data: updateData, basePath: 'clinicInfo.$'
                });
        const doctor = await Doctor.findOneAndUpdate(
            { _id: doctorId, 'clinicInfo._id': clinicId },
            updatedFields ,
            { new: true, runValidators: true }
        );

        if (!doctor) throw new AppError(404, httpStatus.FAIL, 'Doctor not found');

        return doctor.clinicInfo.find(clinic => clinic._id.toString() === clinicId);
    };
    async deleteDoctorClinicInfo(doctorId, clinicId){
        const doctor = await Doctor.findOneAndUpdate(
            { _id: doctorId},
            { $pull: { clinicInfo: { _id: clinicId } } },
            { new: true }
        );

        if (!doctor) throw new AppError(404, httpStatus.FAIL, 'Doctor not found');

        return { IDDeleted: clinicId };
    };



}

module.exports = new DoctorService();