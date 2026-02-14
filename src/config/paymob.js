const axios = require('axios');
const crypto = require('crypto');
const config = require('./config');
const logger = require('../core/logger');

const PAYMOB_BASE_URL = 'https://accept.paymob.com/api';

class PaymobService {
    async authenticate() {
        try {
            const response = await axios.post(`${PAYMOB_BASE_URL}/auth/tokens`, {
                api_key: config.paymobApiKey
            });

            return response.data.token;
        } catch (error) {
            logger.error('Paymob Authentication Error:', error.response?.data);
            throw new Error('Failed to authenticate with Paymob');
        }
    }

    async registerOrder(authToken, amount, deliveryNeeded = "false", currency = 'EGP') {
        try {
            const response = await axios.post(`${PAYMOB_BASE_URL}/ecommerce/orders`, {
                auth_token: authToken,
                delivery_needed: deliveryNeeded,
                amount_cents: amount * 100,
                currency: currency,
                items: []
            });

            return response.data;
        } catch (error) {
            logger.error('Paymob Order Registration Error:', error.response?.data);
            throw new Error('Failed to register order with Paymob');
        }
    }

    async getPaymentToken(authToken, orderId, amount, billingData, integrationId) {
        try {
            const response = await axios.post(`${PAYMOB_BASE_URL}/acceptance/payment_keys`, {
                auth_token: authToken,
                amount_cents: amount * 100,
                expiration: 600,
                order_id: orderId,
                billing_data: billingData,
                currency: "EGP",
                integration_id: integrationId
            });

            return response.data.token;
        } catch (error) {
            logger.error('Paymob Payment Token Error:', error.response?.data);
            throw new Error('Failed to get payment token from Paymob');
        }
    }

    async initiatePayment(paymentData) {
        try {
            const authToken = await this.authenticate();

            const order = await this.registerOrder(
                authToken,
                paymentData.amount,
                paymentData.currency || 'EGP'
            );

            const integrationId = paymentData.paymentMethod === 'wallet' 
                ? config.paymobIntegrationIdWallet 
                : config.paymobIntegrationIdCard;

            const paymentToken = await this.getPaymentToken(
                authToken,
                order.id,
                paymentData.amount,
                paymentData.billingData,
                integrationId
            );

            return {
                orderId: order.id,
                paymentToken: paymentToken,
                iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${config.paymobIframeId}?payment_token=${paymentToken}`
            };
        } catch (error) {
            logger.error('Paymob Payment Initiation Error:', error);
            throw error;
        }
    }

    verifyCallback(callbackData) {
        try {
            const { hmac, order, ...rest } = callbackData;

            const hmacFields = [
            callbackData.amount_cents,
            callbackData.created_at,
            callbackData.currency,
            callbackData.error_occured,
            callbackData.has_parent_transaction,
            callbackData.id,
            callbackData.integration_id,
            callbackData.is_3d_secure,
            callbackData.is_auth,
            callbackData.is_capture,
            callbackData.is_refunded,
            callbackData.is_standalone_payment,
            callbackData.is_voided,
            callbackData.order?.id || callbackData.order_id, 
            callbackData.owner,
            callbackData.pending,
            callbackData.source_data?.pan || callbackData['source_data.pan'],
            callbackData.source_data?.sub_type || callbackData['source_data.sub_type'],
            callbackData.source_data?.type || callbackData['source_data.type'],
            callbackData.success
        ];

        const concatenatedString = hmacFields
            .map(field => (field === null || field === undefined ? "" : String(field)))
            .join('');

            const calculatedHmac = crypto
                .createHmac('sha512', config.paymobHmacSecret)
                .update(concatenatedString)
                .digest('hex');

            return calculatedHmac === hmac;
        } catch (error) {
            logger.error('HMAC Verification Error:', error);
            return false;
        }
    }

    processCallback(callbackData) {
        const isValid = this.verifyCallback(callbackData);
        
        if (!isValid) {
            throw new Error('Invalid HMAC - Callback verification failed');
        }

        return {
            transactionId: callbackData.id,
            orderId: callbackData.order?.id,
            success: callbackData.success === 'true' || callbackData.success === true,
            pending: callbackData.pending === 'true' || callbackData.pending === true,
            amount: callbackData.amount_cents / 100,
            currency: callbackData.currency,
            errorOccurred: callbackData.error_occured === 'true' || callbackData.error_occured === true,
            paymentMethod: callbackData.source_data_type,
            card: {
                pan: callbackData.source_data_pan,
                type: callbackData.source_data_sub_type
            }
        };
    }

    async refundTransaction(transactionId, refundPercentage=1, amount) {
        try {
            const authToken = await this.authenticate();

            const response = await axios.post(`${PAYMOB_BASE_URL}/acceptance/void_refund/refund`, {
                auth_token: authToken,
                transaction_id: transactionId,
                amount_cents: Math.round((refundPercentage * amount) * 100)
            });

            return response.data;
        } catch (error) {
            logger.error('Paymob Refund Error:', error.response?.data);
            throw new Error('Failed to refund transaction');
        }
    }

    async getTransactionDetails(transactionId) {
        try {
            const authToken = await this.authenticate();

            const response = await axios.get(
                `${PAYMOB_BASE_URL}/acceptance/transactions/${transactionId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Paymob Transaction Details Error:', error.response?.data);
            throw new Error('Failed to get transaction details');
        }
    }

}


module.exports = new PaymobService();