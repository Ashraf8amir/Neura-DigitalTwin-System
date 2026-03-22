const Doctor = require('./doctor.model');
const AppError = require('../../core/appError');
const { HTTP_STATUS_TEXT } = require('../../shared/constants/enums.js');
const doctorHelper = require('./doctor.helper')
const { buildPatchUpdate, getPagination } = require('../../shared/utils/globalHelper');
const cloudinaryService = require('../../config/cloudinary');
const enums = require('../../shared/constants/enums');


class DoctorService {

    selectBasicFields = 'firstName lastName fullName email phone dateOfBirth gender age role address nationality profileImage';

    async getDoctorById(doctorId) {
        const doctor = await Doctor.findById(doctorId);

        if (!doctor) {
            throw new AppError(404, HTTP_STATUS_TEXT.FAIL, 'Doctor not found');
        }

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

        if (!doctor) throw new AppError(404, HTTP_STATUS_TEXT.FAIL, 'Doctor not found');

        return doctor;
    };

    async getDoctorProfessionalInfo(doctorId) {
        const doctor = await Doctor.findById(doctorId)
        
        if (!doctor) throw new AppError(404, HTTP_STATUS_TEXT.FAIL, 'Doctor not found');

        return doctor.professionalInfo;
    };
    async updateDoctorProfessionalInfo(doctorId, updateData){
        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            { $set: { professionalInfo: updateData } },
            { new: true, runValidators: true }
        );

        if (!doctor) throw new AppError(404, HTTP_STATUS_TEXT.FAIL, 'Doctor not found');

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

        if (!doctor) throw new AppError(404, HTTP_STATUS_TEXT.FAIL, 'Doctor not found');

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

        if (!doctor) throw new AppError(404, HTTP_STATUS_TEXT.FAIL, 'Doctor not found');

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

        if (!doctor) throw new AppError(404, HTTP_STATUS_TEXT.FAIL, 'Doctor not found');

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
        const updatedFields = buildPatchUpdate({ 
                    data: updateData, basePath: 'clinicInfo.$'
                });
        const doctor = await Doctor.findOneAndUpdate(
            { _id: doctorId, 'clinicInfo._id': clinicId },
            updatedFields ,
            { new: true, runValidators: true }
        );

        if (!doctor) throw new AppError(404, HTTP_STATUS_TEXT.FAIL, 'Doctor not found');

        return doctor.clinicInfo.find(clinic => clinic._id.toString() === clinicId);
    };
    async deleteDoctorClinicInfo(doctorId, clinicId){
        const doctor = await Doctor.findOneAndUpdate(
            { _id: doctorId},
            { $pull: { clinicInfo: { _id: clinicId } } },
            { new: true }
        );

        if (!doctor) throw new AppError(404, HTTP_STATUS_TEXT.FAIL, 'Doctor not found');

        return { IDDeleted: clinicId };
    };

    async getDoctorTelemedicineInfo(doctorId) {
        const doctor = await this.getDoctorById(doctorId);

        return doctor.telemedicine;
    };
    async toggleDoctorTelemedicineAvailability(doctorId){
        const doctor = await this.getDoctorById(doctorId);

        doctor.telemedicine.enabled = !doctor.telemedicine.enabled;
        await doctor.save();

        return doctor.telemedicine.enabled;
    };
    async addDoctorTelemedicineInfo(doctorId, telemedicineData){
        const doctor = await this.getDoctorById(doctorId);

        if (!doctor.telemedicine.enabled) {
            throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'Telemedicine is not enabled for this doctor');
        }

        const currentTelemedicine = doctor.telemedicine?.toObject
            ? doctor.telemedicine.toObject()
            : (doctor.telemedicine || {});

        doctor.telemedicine = {
            ...currentTelemedicine,
            ...telemedicineData,
            consultationDuration:
                telemedicineData.consultationDuration ??
                currentTelemedicine.consultationDuration ??
                30,
            enabled: true,
        };

        await doctor.save();

        return doctor.telemedicine;
    }
    async updateDoctorTelemedicineInfo(doctorId, updateData){
        const updatedFields = buildPatchUpdate({ data: updateData, basePath: 'telemedicine' });

        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            updatedFields,
            { new: true, runValidators: true }
        );

        if (!doctor) throw new AppError(404, HTTP_STATUS_TEXT.FAIL, 'Doctor not found');

        return doctor.telemedicine;
    };

    async uploadDoctorNationalIdFront(doctorId, NationalIdFrontFile){
        const doctor = await this.getDoctorById(doctorId);

        const uploadResult = await cloudinaryService.uploadDocumentToCloudinary(
            NationalIdFrontFile.buffer,
            NationalIdFrontFile.originalname,
            NationalIdFrontFile.mimetype,
            {
                folder: `doctors/national-ids`,
                publicId: `national-id-front-${doctorId}-${Date.now()}`
            }
        );

        doctor.requiredDocuments.nationalId.front.url = uploadResult.url;
        doctor.requiredDocuments.nationalId.front.status = enums.DOCUMENT_VERIFICATION_STATUS.UPLOADED;
        await doctor.save();

        return doctor.requiredDocuments.nationalId.front;
    };
    async uploadDoctorNationalIdBack(doctorId, NationalIdBackFile){
        const doctor = await this.getDoctorById(doctorId);

        const uploadResult = await cloudinaryService.uploadDocumentToCloudinary(
            NationalIdBackFile.buffer,
            NationalIdBackFile.originalname,
            NationalIdBackFile.mimetype,
            {
                folder: `doctors/national-ids`,
                publicId: `national-id-back-${doctorId}-${Date.now()}`
            }
        );

        doctor.requiredDocuments.nationalId.back.url = uploadResult.url;
        doctor.requiredDocuments.nationalId.back.status = enums.DOCUMENT_VERIFICATION_STATUS.UPLOADED;
        await doctor.save();

        return doctor.requiredDocuments.nationalId.back;
    };
    async uploadDoctorMedicalLicense(doctorId, medicalLicenseFile, licenseData){
        const doctor = await this.getDoctorById(doctorId);

        const uploadResult = await cloudinaryService.uploadDocumentToCloudinary(
            medicalLicenseFile.buffer,
            medicalLicenseFile.originalname,
            medicalLicenseFile.mimetype,
            {
                folder: `doctors/medical-licenses`,
                publicId: `medical-license-${doctorId}-${Date.now()}`
            }
        );

        doctor.requiredDocuments.medicalLicense.url = uploadResult.url;
        doctor.requiredDocuments.medicalLicense.status = enums.DOCUMENT_VERIFICATION_STATUS.UPLOADED;
        doctor.requiredDocuments.medicalLicense.licenseNumber = licenseData.licenseNumber;
        doctor.requiredDocuments.medicalLicense.issueDate = licenseData.issueDate;
        doctor.requiredDocuments.medicalLicense.expiryDate = licenseData.expiryDate;
        await doctor.save();

        return doctor.requiredDocuments.medicalLicense;
    };
    async uploadDoctorMedicalDegree(doctorId, medicalDegreeFile, degreeData){
        const doctor = await this.getDoctorById(doctorId);

        const uploadResult = await cloudinaryService.uploadDocumentToCloudinary(
            medicalDegreeFile.buffer,
            medicalDegreeFile.originalname,
            medicalDegreeFile.mimetype,
            {
                folder: `doctors/medical-degrees`,
                publicId: `medical-degree-${doctorId}-${Date.now()}`
            }
        );

        doctor.requiredDocuments.medicalDegree.url = uploadResult.url;
        doctor.requiredDocuments.medicalDegree.status = enums.DOCUMENT_VERIFICATION_STATUS.UPLOADED;
        doctor.requiredDocuments.medicalDegree.university = degreeData.university;
        doctor.requiredDocuments.medicalDegree.graduationYear = degreeData.graduationYear;
        doctor.requiredDocuments.medicalDegree.degree = degreeData.degree;
        await doctor.save();

        return doctor.requiredDocuments.medicalDegree;
    };
    async uploadDoctorSyndicateCard(doctorId, syndicateCardFile, cardData){
        const doctor = await this.getDoctorById(doctorId);

        const uploadResult = await cloudinaryService.uploadDocumentToCloudinary(
            syndicateCardFile.buffer,
            syndicateCardFile.originalname,
            syndicateCardFile.mimetype,
            {
                folder: `doctors/syndicate-cards`,
                publicId: `syndicate-card-${doctorId}-${Date.now()}`
            }
        );

        doctor.requiredDocuments.syndicateCard.url = uploadResult.url;
        doctor.requiredDocuments.syndicateCard.status = enums.DOCUMENT_VERIFICATION_STATUS.UPLOADED;
        doctor.requiredDocuments.syndicateCard.syndicateNumber = cardData.syndicateNumber;
        doctor.requiredDocuments.syndicateCard.issueDate = cardData.issueDate;
        await doctor.save();

        return doctor.requiredDocuments.syndicateCard;
    };
    async uploadDoctorMedicalDegree(doctorId, medicalDegreeFile, degreeData){
        const doctor = await this.getDoctorById(doctorId);

        const uploadResult = await cloudinaryService.uploadDocumentToCloudinary(
            medicalDegreeFile.buffer,
            medicalDegreeFile.originalname,
            medicalDegreeFile.mimetype,
            {
                folder: `doctors/medical-degrees`,
                publicId: `medical-degree-${doctorId}-${Date.now()}`
            }
        );

        doctor.requiredDocuments.medicalDegree.url = uploadResult.url;
        doctor.requiredDocuments.medicalDegree.status = enums.DOCUMENT_VERIFICATION_STATUS.UPLOADED;
        doctor.requiredDocuments.medicalDegree.university = degreeData.university;
        doctor.requiredDocuments.medicalDegree.graduationYear = degreeData.graduationYear;
        doctor.requiredDocuments.medicalDegree.degree = degreeData.degree;
        await doctor.save();

        return doctor.requiredDocuments.medicalDegree;
    };
    async uploadDoctorSyndicateCard(doctorId, syndicateCardFile, cardData){
        const doctor = await this.getDoctorById(doctorId);

        const uploadResult = await cloudinaryService.uploadDocumentToCloudinary(
            syndicateCardFile.buffer,
            syndicateCardFile.originalname,
            syndicateCardFile.mimetype,
            {
                folder: `doctors/syndicate-cards`,
                publicId: `syndicate-card-${doctorId}-${Date.now()}`
            }
        );

        doctor.requiredDocuments.syndicateCard.url = uploadResult.url;
        doctor.requiredDocuments.syndicateCard.status = enums.DOCUMENT_VERIFICATION_STATUS.UPLOADED;
        doctor.requiredDocuments.syndicateCard.syndicateNumber = cardData.syndicateNumber;
        doctor.requiredDocuments.syndicateCard.issueDate = cardData.issueDate;
        await doctor.save();

        return doctor.requiredDocuments.syndicateCard;
    };

    async submitDoctorForReview(doctorId) {
        const doctor = await this.getDoctorById(doctorId);

        if (doctor.accountStatus === enums.ACCOUNT_STATUS.PENDING_VERIFICATION) {
            throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'Doctor profile is already submitted for review');
        }

        const allDocumentsUploaded = doctorHelper.areAllRequiredDocumentsUploaded(doctor.requiredDocuments);

        if (!allDocumentsUploaded) {
            throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'All required documents must be uploaded before submitting for review');
        }

        doctor.accountStatus = enums.ACCOUNT_STATUS.PENDING_VERIFICATION;
        await doctor.save();

        return { status: doctor.accountStatus };
    };

    async browseDoctors(filters = {}, options = {}) {
        const {
            page = 1,
            limit = 10,
            sortBy = 'rating',
            sortOrder = 'desc'
        } = options;

        const query = doctorHelper.buildQueryFilters(filters);

        const selectFields = [
            'firstName',
            'lastName',
            'profileImage',
            'gender',
            'professionalInfo.primarySpecialization',
            'clinicInfo.clinicName',
            'clinicInfo.address.city',
            'clinicInfo.address.governorate',
            'clinicInfo.consultationFee',
            'rating',
            'stats.totalReviews'
        ].join(' ');

        const skip = (page - 1) * limit;

        let doctors;
        let total;

        if (sortBy === 'rating') {
            const sortOptions = { rating: sortOrder === 'asc' ? 1 : -1 };

            [doctors, total] = await Promise.all([
                Doctor.find(query)
                    .select(selectFields)
                    .sort(sortOptions)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean(),
                Doctor.countDocuments(query)
            ]);
        } else {
            [doctors, total] = await Promise.all([
                Doctor.find(query)
                    .select(selectFields)
                    .lean(),
                Doctor.countDocuments(query)
            ]);

            doctors = doctors.map(doctor => {
                const lowestFee = doctor.clinicInfo && doctor.clinicInfo.length > 0
                    ? Math.min(...doctor.clinicInfo.map(c => c.consultationFee))
                    : Infinity;
                return { ...doctor, lowestFee };
            });

            doctors.sort((a, b) =>
                sortOrder === 'asc' ? a.lowestFee - b.lowestFee : b.lowestFee - a.lowestFee
            );

            doctors = doctors.slice(skip, skip + parseInt(limit));
        }

        const formattedDoctors = doctors.map(doctor => {
            return {
                id: doctor._id,
                name: `${doctor.firstName} ${doctor.lastName}`,
                specialization: doctor.professionalInfo?.primarySpecialization || 'General',
                profileImage: doctor.profileImage || null,
                rating: doctor.rating || 0,
                reviewsCount: doctor.stats?.totalReviews || 0,
                clinic: doctor.clinicInfo && doctor.clinicInfo.length > 0 ? {
                    name: doctor.clinicInfo[0].clinicName,
                    city: doctor.clinicInfo[0].address.city,
                    governorate: doctor.clinicInfo[0].address.governorate,
                    consultationFee: doctor.clinicInfo[0].consultationFee
                } : null,
                gender: doctor.gender
            };
        });

        return {
            data: formattedDoctors,
            pagination: getPagination(total, page, limit)
        };
    };
}

module.exports = new DoctorService();