// api/stk-push.js
const axios = require('axios');

module.exports = async (req, res) => {
    // CORS headers (required for browser requests)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { phoneNumber, amount, accountReference, transactionDesc } = req.body;

    // Validate required fields
    if (!phoneNumber || !amount) {
        return res.status(400).json({ success: false, message: 'Phone number and amount are required' });
    }

    // Normalize phone to international format (254XXXXXXXX)
    let phone = phoneNumber.replace(/\s/g, '');
    if (phone.startsWith('0')) phone = '254' + phone.substring(1);
    if (!phone.startsWith('254')) phone = '254' + phone;

    // Environment variables (set in Vercel)
    const API_KEY = process.env.PAYLORE_API_KEY;
    const CHANNEL_ID = process.env.PAYLORE_CHANNEL_ID; // optional – if omitted, uses default channel

    if (!API_KEY) {
        return res.status(500).json({ success: false, message: 'Missing Paylore API key' });
    }

    // ⚠️ Hardcoded base URL and endpoint (as requested)
    const PAYLOR_BASE = 'https://api.paylorke.com/api/v1';
    const STK_ENDPOINT = `${PAYLOR_BASE}/merchants/payments/stk-push`;

    try {
        // Build the payload exactly as per documentation
        const payload = {
            phone: phone,                         // required
            amount: amount,                       // required
            reference: accountReference || 'DRRClaim', // required
            description: transactionDesc || 'Processing fee', // optional
        };

        // Include channelId only if provided (optional)
        if (CHANNEL_ID) {
            payload.channelId = CHANNEL_ID;
        }

        // callbackUrl is optional – we omit it and rely on polling status

        const response = await axios.post(STK_ENDPOINT, payload, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        // Response from Paylor: { transactionId, status }
        const data = response.data;
        return res.status(200).json({
            success: true,
            transactionId: data.transactionId,
            status: data.status,
            message: 'STK push initiated'
        });

    } catch (error) {
        console.error('Paylor STK error:', error.response?.data || error.message);
        // Handle known error responses from Paylor (e.g., 402, 400, etc.)
        const statusCode = error.response?.status || 500;
        const message = error.response?.data?.message || error.message || 'Internal server error';
        return res.status(statusCode).json({
            success: false,
            message: message
        });
    }
};
