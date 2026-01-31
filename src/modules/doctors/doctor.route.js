const express = require("express");
const doctorController = require("./doctor.controller");
const validateReq = require("../../shared/middlewares/validation.middleware.js");
const doctorValidators = require("./doctor.validator");
const verifyToken  = require("../../shared/middlewares/verifyToken.middleware.js");
const authorizeRoles = require("../../shared/middlewares/roleCheck.middleware");
const roles = require('../../core/roles');
const uploadMiddleware = require('../../shared/middlewares/upload.middleware.js');


const router = express.Router();

router.use(verifyToken);
router.use(authorizeRoles(roles.DOCTOR));

// ============ Profile Routes ============
router.get("/me",
  doctorController.getMyProfile
);

// ============ Basic Info Routes ============
router.get("/me/basic-info",
  doctorController.getBasicInfo
);
router.patch("/me/basic-info",
  validateReq(doctorValidators.updateBasicInfoSchema),
  doctorController.updateBasicInfo
);

// ============ Professional Info Routes ============
router.get("/me/professional-info",
  doctorController.getProfessionalInfo
);
router.patch("/me/professional-info",
  validateReq(doctorValidators.updateProfessionalInfoSchema),
  doctorController.updateProfessionalInfo
);

// --- Certificates ---
router.post("/me/professional-info/certificates",
  uploadMiddleware.uploadImageOrPDF,
  validateReq(doctorValidators.addCertificateSchema),
  doctorController.addCertificate
);
router.delete("/me/professional-info/certificates/:certificateId",
  doctorController.deleteCertificate
);

// --- Memberships ---
router.post("/me/professional-info/memberships",
  validateReq(doctorValidators.addMembershipSchema),
  doctorController.addMembership
);
router.delete("/me/professional-info/memberships/:membershipId",
  doctorController.deleteMembership
);

// --- Awards ---
router.post("/me/professional-info/awards",
  uploadMiddleware.uploadImageOrPDF,
  validateReq(doctorValidators.addAwardSchema),
  doctorController.addAward
);
router.delete("/me/professional-info/awards/:awardId",
  doctorController.deleteAward
);

// ============ Clinic Info Routes ============
router.get("/me/clinic-info",
  doctorController.getClinicInfo
);
router.post("/me/clinic-info",
    validateReq(doctorValidators.setClinicInfoSchema),
    doctorController.setClinicInfo
);
router.patch("/me/clinic-info/:clinicId",
  validateReq(doctorValidators.updateClinicInfoSchema),
  doctorController.updateClinicInfo
);
router.delete("/me/clinic-info/:clinicId",
  doctorController.deleteClinicInfo
);

// ============ Telemedicine Routes ============
router.get("/me/telemedicine",
  doctorController.getTelemedicineInfo
);
router.patch("/me/telemedicine",
  validateReq(doctorValidators.updateTelemedicineSchema),
  doctorController.updateTelemedicineInfo
);
router.patch('/telemedicine/toggle',
    doctorController.toggleTelemedicineAvailability
);

// ============ Document Upload Routes ============

// National ID
router.post("/me/documents/national-id-front",
  uploadMiddleware.uploadImageOrPDF,
  doctorController.uploadNationalIdFront
);
router.post("/me/documents/national-id-back",
  uploadMiddleware.uploadImageOrPDF,
  doctorController.uploadNationalIdBack
);

// Medical License
router.post("/me/documents/medical-license",
  uploadMiddleware.uploadImageOrPDF,
  validateReq(doctorValidators.uploadMedicalLicenseSchema),
  doctorController.uploadMedicalLicense
);

// Medical Degree
router.post("/me/documents/medical-degree",
  uploadMiddleware.uploadImageOrPDF,
  validateReq(doctorValidators.uploadMedicalDegreeSchema),
  doctorController.uploadMedicalDegree
);

// Syndicate Card
router.post("/me/documents/syndicate-card",
  uploadMiddleware.uploadImageOrPDF,
  validateReq(doctorValidators.uploadSyndicateCardSchema),
  doctorController.uploadSyndicateCard
);


// Submit for Review
router.post("/me/submit-for-review",
  doctorController.submitForReview
);

module.exports = router;