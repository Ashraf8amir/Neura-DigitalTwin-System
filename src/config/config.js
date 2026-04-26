require('dotenv').config();

const config = {
    PORT: Number(process.env.PORT) || 4000,
    mongoURL: process.env.MONGO_URL,
    nodeEnv: process.env.NODE_ENV,

    jwtSecret: process.env.JWT_SECRET,
    accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
    refreshTokenLength: Number(process.env.REFRESH_TOKEN_LENGTH),
    resetTokenLength: Number(process.env.RESET_TOKEN_LENGTH),

    bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS),

    resendApiKey: process.env.RESEND_API_KEY,

    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',

    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,

    adminEmail: process.env.ADMIN_EMAIL,
    adminPassword: process.env.ADMIN_PASSWORD,

    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,

    jobSecretKey: process.env.JOB_SECRET_KEY,

    paymobApiKey: process.env.PAYMOB_API_KEY,
    paymobIntegrationIdCard: process.env.PAYMOB_INTEGRATION_ID_CARD,
    paymobIntegrationIdWallet: process.env.PAYMOB_INTEGRATION_ID_WALLET,
    paymobIframeId: process.env.PAYMOB_IFRAME_ID,
    paymobHmacSecret: process.env.PAYMOB_HMAC_SECRET,


    assemblyAiApiKey: process.env.ASSEMBLYAI_API_KEY,
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    pineconeApiKey: process.env.PINECONE_API_KEY,
    pineconeIndex: process.env.PINECONE_INDEX,
    pineconeHost: process.env.PINECONE_HOST,
    groqApiKey: process.env.GROQ_API_KEY,
    grokApiKey: process.env.GROQ_API_KEY,
    agoraAppId: process.env.AGORA_APP_ID,
    agoraAppCertificate: process.env.AGORA_APP_CERTIFICATE,
};

module.exports = config;
