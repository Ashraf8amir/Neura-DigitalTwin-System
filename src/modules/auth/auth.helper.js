const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { generateState, generateCodeVerifier } = await require('arctic');
const AppError = require('../../core/appError.js');
const httpStatus = require('../../core/httpStatus.js');
const config = require('../../config/config');
const logger = require('../../core/logger.js');

exports.getCookieConfig = () => {
    const isProduction = config.nodeEnv === 'production';
    
    return {
        refresh: {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'strict',
            maxAge: config.refreshTokenExpiresIn.split('d')[0] * 24 * 60 * 60 * 1000, 
            path: '/' 
        },
        state: {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'strict', 
            maxAge: 10 * 60 * 1000, 
            path: '/'
        },
        code_verifier: {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'strict', 
            maxAge: 10 * 60 * 1000, 
            path: '/'
        },
        temp_google_user: {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'strict',
            maxAge: 10 * 60 * 1000, 
            path: '/'
        }
    };
};

exports.generateToken = (user) => {
    const payload = {
        id: user._id,
        email: user.email,
        role: user.role
    };

    const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: config.accessTokenExpiresIn });
    const refreshToken = crypto.randomBytes(config.refreshTokenLength).toString('hex');
    return { accessToken, refreshToken };
};

exports.generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.generateResetToken = () => {
    return crypto.randomBytes(config.resetTokenLength).toString('hex');
};

exports.hashResetToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

exports.hashedPassword = async (password) => {
    const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
};

exports.generateGoogleAuthUrl = () => {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", config.googleClientId);
    authUrl.searchParams.set("redirect_uri", config.googleRedirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", "openid profile email");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    return { authUrl, state, codeVerifier };
};

exports.generateTokenResponse = async (code, codeVerifier) => {
    let tokenResponse;
    try {
        const tokenUrl = 'https://oauth2.googleapis.com/token';

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code: code,
                client_id: config.googleClientId,
                client_secret: config.googleClientSecret,
                redirect_uri: config.googleRedirectUri,
                grant_type: 'authorization_code',
                code_verifier: codeVerifier
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            logger.error('Token exchange failed:', errorData);
            throw new Error(errorData.error_description || 'Token exchange failed');
        }
        tokenData = await response.json();
        tokenResponse = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresIn: tokenData.expires_in,
            idToken: tokenData.id_token
        };

        return tokenResponse;

    } catch (error) {
        logger.error('Failed to exchange authorization code for tokens:', error);
        throw new AppError(500, httpStatus.FAIL, 'Failed to exchange authorization code for tokens');
    }
};

exports.getUserInfo = async (accessToken) => {
    let userInfo;       
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }

        userInfo = await response.json();
    } catch (error) {
        logger.error('Failed to fetch user info from Google:', error);
        throw new AppError(400, httpStatus.FAIL, 'Failed to fetch user info from Google');
    }

    const firstName = userInfo.given_name || userInfo.name?.split(' ')[0] || 'User';
    const lastName = userInfo.family_name || userInfo.name?.split(' ').slice(1).join(' ') || '';

    return {
        email: userInfo.email,
        firstName: firstName,
        lastName: lastName,
        timestamp: Date.now()
    };
};