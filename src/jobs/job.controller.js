const asyncWrapper = require('../shared/middlewares/asyncWrapper.middleware');
const { HTTP_STATUS_TEXT } = require('../shared/constants/enums.js');
const ApiResponse = require('../core/apiResponse');
const appError = require('../core/appError');
const Service = require('./job.service');
const config = require('../config/config');


/**    
    * @desc    Cancel unconfirmed appointments that are pending for more than 10 minutes
    * @route   POST /api/v1/jobs/cancel/unconfirmed-appointments
*/
exports.cancelUnconfirmedAppointments = asyncWrapper(async (req, res) => {
    const secretKey = req.query.secret;
    if (secretKey !== config.jobSecretKey) {
        throw new appError(401, HTTP_STATUS_TEXT.UNAUTHORIZED, 'Unauthorized access to this job');
    }

    const cancelledCount = await Service.cancelUnconfirmedAppointments();

    return new ApiResponse(
        res,
        200,
        HTTP_STATUS_TEXT.SUCCESS,
        `Unconfirmed appointments cancelled successfully. Total cancelled: ${cancelledCount}`
    );
});
/**    
    * @desc    Unblock patients who have served their blacklist duration
    * @route   POST /api/v1/jobs/unblock/blacklisted-patients
*/
exports.unblockBlacklistedPatients = asyncWrapper(async (req, res) => {
    const secretKey = req.query.secret;
    if (secretKey !== config.jobSecretKey) {
        throw new appError(401, HTTP_STATUS_TEXT.UNAUTHORIZED, 'Unauthorized access to this job');
    }

    const unblockedCount = await Service.unblockBlacklistedPatients();

    return new ApiResponse(
        res,
        200,
        HTTP_STATUS_TEXT.SUCCESS,
        `Blacklisted patients unblocked successfully. Total unblocked: ${unblockedCount}`
    );
});