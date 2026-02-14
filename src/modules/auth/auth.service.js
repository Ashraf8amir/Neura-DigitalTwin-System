const crypto = require("crypto");
const path = require("path");
const bcrypt = require("bcryptjs");
const ejs = require("ejs");
const jwt = require('jsonwebtoken');
const User = require('../../shared/models/user.model.js');
const Patient = require('../../modules/patients/patient.model.js');
const Doctor = require('../../modules/doctors/doctor.model.js');
const Nurse = require('../../modules/nurses/nurse.model.js');
const Pharmacy = require('../../modules/pharmacies/pharmacy.model.js');
const AppError = require('../../core/appError.js');
const config = require('../../config/config.js');
const sendMail = require('../../shared/utils/emailSender.js');
const { HTTP_STATUS_TEXT } = require('../../shared/constants/enums.js');
const logger = require('../../core/logger.js');
const enums = require('../../shared/constants/enums.js');
const authHelper = require('./auth.helper.js');
const { setRefreshTokenInDB } = require('../../shared/utils/globalHelper.js');

class AuthService {
    async registerService(userData, req) {
        const { email, password, role } = userData;

        const existingUser = await User.findOne({ email });
        if (existingUser) throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'Email already registered');
        
        userData.password = await authHelper.hashedPassword(password);

        let model; 

        if (role === enums.ROLE.PATIENT)  model = Patient;
        else if (role === enums.ROLE.DOCTOR) model = Doctor;
        else if (role === enums.ROLE.NURSE) model = Nurse;
        else if (role === enums.ROLE.PHARMACY) model = Pharmacy;
        
        const newUser = await new model(userData).save();

        const refreshToken = authHelper.generateRefreshToken();
        const sessionId = await setRefreshTokenInDB(newUser._id, refreshToken, req);
        const accessToken = authHelper.generateAccessToken(newUser, sessionId);

        setImmediate(async () => {
            try {
                const htmlContent = await ejs.renderFile(
                    path.join(__dirname, "../../templates/emails/auth/welcome.ejs"),
                    { 
                        userName: newUser.fullName,
                        role: role,
                        profileLink: `${config.frontendUrl}/${role}/profile`
                    }
                );

                await sendMail(
                    newUser.email,
                    `Welcome to Sahtak - Complete Your ${role === enums.ROLE.DOCTOR ? 'Doctor' : 'Patient'} Profile`,
                    htmlContent,
                    `Welcome ${newUser.fullName},\n\nYour ${role} account has been created. Please complete your profile to start using Sahtak.`
                );
            } catch (emailError) {
                logger.error('Welcome email sending failed:', emailError);
            }
        });

        return { user: newUser, accessToken, refreshToken };
    }
    async loginService(credentials, req) {
        const { email, password } = credentials;

        const existingUser = await User.findOne({ email });
        if (!existingUser) throw new AppError(401, HTTP_STATUS_TEXT.FAIL, 'Invalid email');

        const isPasswordValid = await bcrypt.compare(password, existingUser.password);
        if (!isPasswordValid) {
            await existingUser.save();
            throw new AppError(401, HTTP_STATUS_TEXT.UNAUTHORIZED, 'Invalid credentials');
        }

        await existingUser.save();

        const refreshToken = authHelper.generateRefreshToken();
        const sessionId = await setRefreshTokenInDB(existingUser._id, refreshToken, req);
        const accessToken = authHelper.generateAccessToken(existingUser, sessionId);

        existingUser.activity.lastLogin = new Date();
        existingUser.activity.loginCount += 1;
        await existingUser.save();

        return { user: existingUser, accessToken, refreshToken  };
    }
    async logoutService(refreshToken) {
        if (!refreshToken) throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'Refresh token required');

        const result = await User.updateOne(
            { "refreshTokens.token": refreshToken },
            { $pull: { refreshTokens: { token: refreshToken } } }
        );

        if (result.modifiedCount === 0)
            throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'Invalid refresh token');

        return true;
    }
    async refreshTokenService(oldRefreshToken, req) {
        if (!oldRefreshToken) throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'Refresh token required');

        const user = await User.findOneAndUpdate(
          {
            "refreshTokens.token": oldRefreshToken,
            "refreshTokens.expiresAt": { $gt: new Date() },
            isDeleted: false,
          },
          {
            $pull: { refreshTokens: { token: oldRefreshToken } },
          },
          { new: false }
        );

        if (!user) throw new AppError(401, HTTP_STATUS_TEXT.UNAUTHORIZED, 'Invalid or expired refresh token');

        const refreshToken = authHelper.generateRefreshToken();
        const sessionId = await setRefreshTokenInDB(user._id, refreshToken, req);
        const accessToken = authHelper.generateAccessToken(user, sessionId);

        return { accessToken, refreshToken  };
    }
    async googleCallbackService(data, req) {
        const { user, isNewUser, userInfo } = data;

        if (!isNewUser) {
            const refreshToken = authHelper.generateRefreshToken();
            const sessionId = await setRefreshTokenInDB(user._id, refreshToken, req);
            const accessToken = authHelper.generateAccessToken(user, sessionId);
            return { user, accessToken, refreshToken, isNewUser };
        }

        const tempToken = jwt.sign(userInfo, config.jwtSecret, { expiresIn: '15m' });
        return { userInfo, tempToken, isNewUser };
    }
    async completeGoogleRegistrationService(userData, req) {
        const { role, gender, dateOfBirth, tempToken } = userData;

        if (!tempToken) {
            throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'Temporary token missing');
        }
        
        let googleUserInfo;
        try {
            googleUserInfo = jwt.verify(tempToken, config.jwtSecret);
        } catch (error) {
            throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'Invalid or expired token');
        }

        const existingUser = await User.findOne({ email: googleUserInfo.email });
        if (existingUser) {
            throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'User already exists');
        }

        const randomPassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await authHelper.hashedPassword(randomPassword);

        const baseUserData = {
            email: googleUserInfo.email,
            firstName: googleUserInfo.firstName,
            lastName: googleUserInfo.lastName,
            googleId: googleUserInfo.googleId,
            password: hashedPassword,
            role: role,
            provider: 'google'
        };

        let newUser;
        switch (role) {
            case enums.ROLE.PATIENT: 
                newUser = await new Patient({ ...baseUserData, gender, dateOfBirth }).save();
                break;
            case enums.ROLE.DOCTOR:
                newUser = await new Doctor({ ...baseUserData, gender, dateOfBirth }).save();
                break;
            case enums.ROLE.NURSE:
                newUser = await new Nurse({ ...baseUserData, gender, dateOfBirth }).save();
                break;
            case enums.ROLE.PHARMACY:
                newUser = await new Pharmacy({ ...baseUserData, gender, dateOfBirth }).save();
                break;  
            default:
                throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'Invalid role specified'); 
        }

        const refreshToken = authHelper.generateRefreshToken();
        const sessionId = await setRefreshTokenInDB(newUser._id, refreshToken, req);
        const accessToken = authHelper.generateAccessToken(newUser, sessionId);

        setImmediate(async () => {
            try {
                const htmlContent = await ejs.renderFile(
                    path.join(__dirname, "../../templates/emails/auth/welcome.ejs"),
                    { 
                        userName: newUser.fullName,
                        role: role,
                        profileLink: `${config.frontendUrl}/${role}/profile`
                    }
                );

                await sendMail(
                    newUser.email,
                    `Welcome to Sahtak - Complete Your ${role} Profile`,
                    htmlContent,
                    `Welcome ${newUser.fullName}`
                );
            } catch (emailError) {
                logger.error('Welcome email failed:', emailError);
            }
        });

        return { user: newUser, accessToken, refreshToken };
    }
    async sendVerifyOtpService(email) {
        const user = await User.findOne({ email });
        if (!user) throw new AppError(404, HTTP_STATUS_TEXT.FAIL, 'User with this email does not exist');

        if (user.isEmailVerified) throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'Email is already verified');

        if (user.verifyOtpExpiry) {
            const otpLifetime = 10 * 60 * 1000; 
            const otpCooldown = 1 * 60 * 1000; 
            const sentAt = user.verifyOtpExpiry - otpLifetime;

            if (Date.now() - sentAt < otpCooldown) {
                const remainingTime = Math.ceil((otpCooldown - (Date.now() - sentAt)) / 1000);
                throw new AppError(
                    429,
                    HTTP_STATUS_TEXT.FAIL,
                    `Please wait ${remainingTime} seconds before requesting another verification code`
                );
            }
        }

        const otp = authHelper.generateOTP();
        user.verifyOtp = otp;
        user.verifyOtpExpiry = Date.now() + 10 * 60 * 1000;
        await user.save();

        setImmediate(async () => {
             try {
               const htmlContent = await ejs.renderFile(
                 path.join(__dirname,"../../templates/emails/auth/verify-otp.ejs"),
                 { fullName: user.fullName, otp }
               );

               await sendMail(
                 user.email,
                 "sahtak - Email Verification OTP",
                 htmlContent,
                 `Your OTP for email verification is ${otp}. It is valid for 10 minutes.`
               );

               logger.info(`Verification OTP email sent`);
             } catch (emailError) {
                 logger.error('Verification OTP email sending failed:', emailError);
             }
        });

        return true;
    }
    async verifyEmailService(email, otp) {
        const user = await User.findOne({ email });
        if (!user) throw new AppError(404, HTTP_STATUS_TEXT.FAIL, 'User with this email does not exist');

        if (!user.verifyOtp || !user.verifyOtpExpiry || user.verifyOtpExpiry < Date.now()) {
            throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'OTP has expired. Please request a new one.');
        }

        if (user.verifyOtp !== otp) throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'Invalid OTP. Please try again.');

        if (Date.now() > user.verifyOtpExpiry) {
            user.verifyOtp = undefined;
            user.verifyOtpExpiry = undefined;
            await user.save();

            throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'Verification code has expired. Please request a new one.');
        }

        user.isEmailVerified = true;
        user.verifyOtp = undefined;
        user.verifyOtpExpiry = undefined;
        await user.save();

        return true;
    }
    async requestPasswordResetService(email) {
        const user = await User.findOne({ email });
        if (!user) throw new AppError(404, HTTP_STATUS_TEXT.FAIL, 'User with this email does not exist');

        if (user.isDeleted) 
            throw new AppError(403, HTTP_STATUS_TEXT.FAIL, 'This account has been deleted. Contact support to restore it.');

        const resetToken = authHelper.generateResetToken();
        const resetTokenHash = authHelper.hashResetToken(resetToken);

        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
        await user.save();

        const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

        setImmediate( async () => {
            try {
                const htmlContent = await ejs.renderFile(
                    path.join(__dirname,"../../templates/emails/auth/reset-password.ejs"),
                    { fullName: user.fullName, resetUrl, expiryMinutes: 15 }
                );
                await sendMail(
                    user.email,
                    "sahtak - Password Reset Request",
                    htmlContent,
                    `You requested a password reset. Click the link to reset your password: ${resetUrl}`
                );
                logger.info(`Password reset email sent to ${user.email}`);
            } catch (emailError) {
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;
                await user.save();

                logger.error('Password reset email sending failed:', emailError);
            }
        });

        return true;
    }
    async resetPasswordService(token, newPassword) {
        const hashedToken = authHelper.hashResetToken(token);

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'Invalid or expired password reset token');

        const hashedPwd = await authHelper.hashedPassword(newPassword);
        user.password = hashedPwd;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        if(user.password){
            user.passwordHistory.push({
                password: hashedPwd,
                changedAt: new Date()
            })

            if(user.passwordHistory.length > 5)
                user.passwordHistory = user.passwordHistory.slice(-5);
        }

        user.refreshTokens = [];
        await user.save();

        setImmediate( async () => {
            try {
                const htmlContent = await ejs.renderFile(
                  path.join(
                    __dirname,
                    "../../templates/emails/auth/change-password.ejs"
                  ),
                  {
                    userName: user.fullName,
                    changeDate: new Date(),
                    supportEmail: "support@sahtak.com",
                  }
                );
                await sendMail(
                    user.email,
                    "sahtak - Password Changed Successfully",
                    htmlContent,
                    "Your password has been changed successfully. If you did not perform this action, please contact support immediately."
                );
                logger.info(`Password change notification email sent to ${user.email}`);
            } catch (emailError) {
                logger.error('Password change notification email sending failed:', emailError);
            }
        })

        return true;
    }
    async changePasswordService(email, currentPassword, newPassword, currentRefreshToken) {
        const user = await User.findOne({ email });
        if (!user) throw new AppError(404, HTTP_STATUS_TEXT.FAIL, 'User not found');

        if (user.provider === 'google') {
            throw new AppError(400, HTTP_STATUS_TEXT.FAIL, 'Google account users cannot change password.');
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) throw new AppError(401, HTTP_STATUS_TEXT.UNAUTHORIZED, 'Current password is incorrect');

        const hashedPwd = await authHelper.hashedPassword(newPassword);
        user.password = hashedPwd;
        user.passwordHistory.push({
            password: hashedPwd,
            changedAt: new Date()
        });

        if(user.passwordHistory.length > 5)
            user.passwordHistory = user.passwordHistory.slice(-5);

        user.refreshTokens = user.refreshTokens.filter(rt => rt.token === currentRefreshToken);

        await user.save();

        setImmediate( async () => {
            try {
                const htmlContent = await ejs.renderFile(
                  path.join(
                    __dirname,
                    "../../templates/emails/auth/change-password.ejs"
                  ),
                  {
                    userName: user.fullName,
                    changeDate: new Date(),
                    supportEmail: "support@sahtak.com",
                  }
                );
                await sendMail(
                    user.email,
                    "sahtak - Password Changed Successfully",
                    htmlContent,
                    "Your password has been changed successfully. If you did not perform this action, please contact support immediately."
                );
                logger.info(`Password change notification email sent to ${user.email}`);
            } catch (emailError) {
                logger.error('Password change notification email sending failed:', emailError);
            }
        })

        return true;
    }
}


module.exports = new AuthService();