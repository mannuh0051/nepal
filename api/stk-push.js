// api/stk-push.js
const axios = require('axios');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { phoneNumber, amount, accountReference, transactionDesc } = req.body;

    // Validate inputs
    if (!phoneNumber || !amount) {
        return res.status(400).json({ success: false, message: 'Missing phone number or amount' });
    }

    // Normalize phone number (remove leading 0, add 254)
    let phone = phoneNumber.replace(/\s/g, '');
    if (phone.startsWith('0')) phone = '254' + phone.substring(1);
    if (!phone.startsWith('254')) phone = '254' + phone;

    // Environment variables (set in Vercel)
    const CONSUMER_KEY = process.env.CONSUMER_KEY;
    const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
    const SHORTCODE = process.env.SHORTCODE;
    const PASSKEY = process.env.PASSKEY;
    const BASE_URL = process.env.BASE_URL || 'https://sandbox.safaricom.co.ke'; // Use sandbox by default

    if (!CONSUMER_KEY || !CONSUMER_SECRET || !SHORTCODE || !PASSKEY) {
        return res.status(500).json({ success: false, message: 'Missing M-Pesa credentials' });
    }

    try {
        // 1. Get OAuth token
        const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
        const tokenRes = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: { Authorization: `Basic ${auth}` }
        });
        const accessToken = tokenRes.data.access_token;

        // 2. Generate timestamp and password
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');

        // 3. STK push payload
        const stkPayload = {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: phone,
            PartyB: SHORTCODE,
            PhoneNumber: phone,
            CallBackURL: process.env.CALLBACK_URL || 'https://your-app.vercel.app/api/callback',
            AccountReference: accountReference || 'DRRClaim',
            TransactionDesc: transactionDesc || 'Processing fee'
        };

        const stkRes = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, stkPayload, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        // Success: response from Safaricom
        if (stkRes.data.ResponseCode === '0') {
            return res.status(200).json({
                success: true,
                message: 'STK push sent successfully',
                data: stkRes.data
            });
        } else {
            return res.status(200).json({
                success: false,
                message: stkRes.data.ResponseDescription || 'STK push failed'
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.response?.data?.errorMessage || error.message || 'Internal server error'
        });
    }
};
