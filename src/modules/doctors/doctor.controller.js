const asyncWrapper = require('../../shared/middlewares/asyncWrapper.middleware');
const httpStatus = require('../../core/httpStatus');
const ApiResponse = require('../../core/apiResponse');
const service = require('./doctor.service');

/**
    *  @desc Get my profile
    *  @route GET /api/v1/doctors/me
    *  @access Private (Doctor)
*/
exports.getMyProfile = asyncWrapper(async (req, res) => {
    const doctor = await service.getDoctorById(req.user.id);

    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Doctor profile retrieved successfully',
        { doctor }
    );
});

// ============ Basic Info Controller ============

/**
    * @desc Get doctor's basic info
    * @route GET /api/v1/doctors/me/basic-info
    * @access Private (Doctor)
*/
exports.getBasicInfo = asyncWrapper(async (req, res) => {
    const basicInfo = await service.getDoctorBasicInfo(req.user.id);

    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Doctor basic info retrieved successfully',
        { basicInfo }
    );
});
/**
    * @desc Update doctor's basic info
    * @route PATCH /api/v1/doctors/me/basic-info
    * @access Private (Doctor)
*/
exports.updateBasicInfo = asyncWrapper(async (req, res) => {
    const updatedBasicInfo = await service.updateDoctorBasicInfo(req.user.id, req.body);

    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Doctor basic info updated successfully',
        { basicInfo: updatedBasicInfo }
    );
});

// ============ Professional Info Controller ============

/**
    * @desc Get doctor's professional info
    * @route GET /api/v1/doctors/me/professional-info
    * @access Private (Doctor)
*/
exports.getProfessionalInfo = asyncWrapper(async (req, res) => {
    const professionalInfo = await service.getDoctorProfessionalInfo(req.user.id);  
    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Doctor professional info retrieved successfully',
        { professionalInfo }
    );
});

/**
    * @desc Update doctor's professional info
    * @route PATCH /api/v1/doctors/me/professional-info
    * @access Private (Doctor)  
*/
exports.updateProfessionalInfo = asyncWrapper(async (req, res) => {
    const updatedProfessionalInfo = await service.updateDoctorProfessionalInfo(req.user.id, req.body);

    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Doctor professional info updated successfully',
        { professionalInfo: updatedProfessionalInfo }
    );
});

// --- Certificates ---
/**
    * @desc Add a certificate
    * @route POST /api/v1/doctors/me/professional-info/certificates
    *  @access Private (Doctor)
*/
exports.addCertificate = asyncWrapper(async (req, res) => {
    const newCertificate = await service.addDoctorCertificate(req.user.id, req.body, req.file);

    return new ApiResponse(
        res,
        201,
        httpStatus.SUCCESS,
        'Certificate added successfully',
        { certificate: newCertificate }
    );
});
/**
    * @desc Delete a certificate
    * @route DELETE /api/v1/doctors/me/professional-info/certificates/:certificateId
    * @access Private (Doctor)
*/
exports.deleteCertificate = asyncWrapper(async (req, res) => {
    const { IDDeleted } = await service.deleteDoctorCertificate(req.user.id, req.params.certificateId);

    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Certificate deleted successfully',
        { certificate: IDDeleted }
    );
});

// --- Memberships ---
/**
    * @desc Add a membership
    * @route POST /api/v1/doctors/me/professional-info/memberships
    * @access Private (Doctor)
*/
exports.addMembership = asyncWrapper(async (req, res) => {
    const newMembership = await service.addDoctorMembership(req.user.id, req.body);

    return new ApiResponse(
        res,
        201,
        httpStatus.SUCCESS,
        'Membership added successfully',
        { membership: newMembership }
    );
});
/**
    * @desc Delete a membership
    * @route DELETE /api/v1/doctors/me/professional-info/memberships/:membershipId
    * @access Private (Doctor)
*/
exports.deleteMembership = asyncWrapper(async (req, res) => {
    const deletedMembership = await service.deleteDoctorMembership(req.user.id, req.params.membershipId);

    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Membership deleted successfully',
        { membership: deletedMembership }
    );
});

// --- Awards ---
/**
    * @desc Add an award
    * @route POST /api/v1/doctors/me/professional-info/awards
    * @access Private (Doctor)
*/
exports.addAward = asyncWrapper(async (req, res) => {
    const newAward = await service.addDoctorAward(req.user.id, req.body, req.file);

    return new ApiResponse(
        res,
        201,
        httpStatus.SUCCESS,
        'Award added successfully',
        { award: newAward }
    );
});
/**
    * @desc Delete an award
    * @route DELETE /api/v1/doctors/me/professional-info/awards/:awardId
    * @access Private (Doctor)
*/
exports.deleteAward = asyncWrapper(async (req, res) => {
    const deletedAward = await service.deleteDoctorAward(req.user.id, req.params.awardId);

    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Award deleted successfully',
        { award: deletedAward }
    );
});

// ============ Clinic Info Controller ============

/**
    * @desc Get clinic info
   * @route GET /api/v1/doctors/me/clinic-info
   * @access Private (Doctor)
*/
exports.getClinicInfo = asyncWrapper(async (req, res) => {
    const clinicInfo = await service.getDoctorClinicInfo(req.user.id);

    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Clinic info retrieved successfully',
        { clinicInfo }
    );
});
/**
    * @desc Set clinic info
    * @route POST /api/v1/doctors/me/clinic-info
    * @access Private (Doctor)
*/
exports.setClinicInfo = asyncWrapper(async (req, res) => {
    const clinicInfo = await service.setDoctorClinicInfo(req.user.id, req.body);

    return new ApiResponse(
        res,
        201,
        httpStatus.SUCCESS,
        'Clinic info set successfully',
        { clinicInfo }
    );
});
/**
    * @desc Update clinic info
    * @route PATCH /api/v1/doctors/me/clinic-info/:clinicId
    * @access Private (Doctor)
*/
exports.updateClinicInfo = asyncWrapper(async (req, res) => {
    const updatedClinicInfo = await service.updateDoctorClinicInfo(req.user.id, req.params.clinicId, req.body);

    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Clinic info updated successfully',
        { clinicInfo: updatedClinicInfo }
    );
});
/**
    * @desc Delete clinic info
    * @route DELETE /api/v1/doctors/me/clinic-info/:clinicId
    * @access Private (Doctor)
*/
exports.deleteClinicInfo = asyncWrapper(async (req, res) => {
    const deletedClinicInfo = await service.deleteDoctorClinicInfo(req.user.id, req.params.clinicId);
    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Clinic info deleted successfully',
        { clinicInfo: deletedClinicInfo }
    );
});

// ============ Telemedicine Controller ============

/**
    * @desc Get telemedicine info
    * @route GET /api/v1/doctors/me/telemedicine
    * @access Private (Doctor)
*/
exports.getTelemedicineInfo = asyncWrapper(async (req, res) => {
    const telemedicineInfo = await service.getDoctorTelemedicineInfo(req.user.id);

    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Telemedicine info retrieved successfully',
        { telemedicineInfo }
    );
});

/**
    * @desc Update telemedicine info
    * @route PATCH /api/v1/doctors/me/telemedicine
    * @access Private (Doctor)
*/
exports.updateTelemedicineInfo = asyncWrapper(async (req, res) => {
    const updatedTelemedicineInfo = await service.updateDoctorTelemedicineInfo(req.user.id, req.body);

    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Telemedicine info updated successfully',
        { telemedicineInfo: updatedTelemedicineInfo }
    );
});

/**
    * @desc Toggle telemedicine availability
    * @route PATCH /api/v1/doctors/me/telemedicine/toggle
    * @access Private (Doctor)
*/
exports.toggleTelemedicineAvailability = asyncWrapper(async (req, res) => {
    const updatedStatus = await service.toggleDoctorTelemedicineAvailability(req.user.id);

    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Telemedicine availability toggled successfully',
        { telemedicineStatus: updatedStatus }
    );
});

// ============ Document Upload Controller ============

/**
    * @desc Upload national ID front side
    * @route POST /api/v1/doctors/me/documents/national-id-front
    * @access Private (Doctor)
*/
exports.uploadNationalIdFront = asyncWrapper(async (req, res) => {
    const documentInfo = await service.uploadDoctorNationalIdFront(req.user.id, req.file);
    
    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'National ID front side uploaded successfully',
        { document: documentInfo }
    );
});

/**
    * @desc Upload national ID back side
    * @route POST /api/v1/doctors/me/documents/national-id-back
    * @access Private (Doctor)
*/
exports.uploadNationalIdBack = asyncWrapper(async (req, res) => {
    const documentInfo = await service.uploadDoctorNationalIdBack(req.user.id, req.file);

    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'National ID back side uploaded successfully',
        { document: documentInfo }
    );
});
/**
    * @desc Upload medical license
    * @route POST /api/v1/doctors/me/documents/medical-license
    * @access Private (Doctor)
*/
exports.uploadMedicalLicense = asyncWrapper(async (req, res) => {
    const documentInfo = await service.uploadDoctorMedicalLicense(req.user.id, req.file);
    
    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Medical license uploaded successfully',
        { document: documentInfo }
    );
});
/**
    * @desc Upload medical degree
    * @route POST /api/v1/doctors/me/documents/medical-degree
    * @access Private (Doctor)
*/
exports.uploadMedicalDegree = asyncWrapper(async (req, res) => {
    const documentInfo = await service.uploadDoctorMedicalDegree(req.user.id, req.file);

    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Medical degree uploaded successfully',
        { document: documentInfo }
    );
});
/**
    * @desc Upload syndicate card
    * @route POST /api/v1/doctors/me/documents/syndicate-card
    * @access Private (Doctor)
*/
exports.uploadSyndicateCard = asyncWrapper(async (req, res) => {
    const documentInfo = await service.uploadDoctorSyndicateCard(req.user.id, req.file);

    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Syndicate card uploaded successfully',
        { document: documentInfo }
    );
});
/**
    * @desc Submit doctor profile for review
    * @route POST /api/v1/doctors/me/submit-for-review
    * @access Private (Doctor)
*/
exports.submitForReview = asyncWrapper(async (req, res) => {
    await service.submitDoctorForReview(req.user.id);

    return new ApiResponse(
        res,
        200,
        httpStatus.SUCCESS,
        'Doctor profile submitted for review successfully'
    );
});