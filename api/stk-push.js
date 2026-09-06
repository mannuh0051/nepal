// api/stk-push.js
const axios = require('axios');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // --- Validate request ---
    const { phoneNumber, amount, accountReference, transactionDesc } = req.body;
    if (!phoneNumber || !amount) {
        return res.status(400).json({ success: false, message: 'Phone number and amount are required' });
    }

    // --- Normalize phone (2547XXXXXXXX) ---
    let phone = phoneNumber.replace(/\s/g, '');
    if (phone.startsWith('0')) phone = '254' + phone.substring(1);
    if (!phone.startsWith('254')) phone = '254' + phone;

    // --- Environment variables (set in Vercel) ---
    const API_KEY = process.env.PAYLORE_API_KEY;          // e.g. pk_wfJ7Gna0...
    const CHANNEL_ID = process.env.PAYLORE_CHANNEL_ID;    // e.g. PAYL-FFJZR5
    const PAYLOR_BASE = 'https://api.paylorke.com/api/v1';  // hardcoded in code

    if (!API_KEY || !CHANNEL_ID) {
        return res.status(500).json({ success: false, message: 'Missing Paylore credentials' });
    }

    try {
        // --- Paylore STK Push payload (matches repo logic) ---
        const payload = {
            phone: phone,                                 // "254712345678"
            amount: amount,                               // 1000
            reference: accountReference || 'DRRClaim',    // "ORDER-12345"
            channelId: CHANNEL_ID,                        // "PAYL-FFJZR5"
            description: transactionDesc || 'Processing fee',
            // callbackUrl: 'https://your-site.com/callback' // optional – we omit, rely on polling
        };

        const response = await axios.post(
            `${PAYLOR_BASE}/merchants/payments/stk-push`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // --- Check response (adjust according to actual Paylore structure) ---
        const data = response.data;
        if (data && data.success !== false) {
            // Assuming Paylore returns a transactionId in data.transactionId
            return res.status(200).json({
                success: true,
                message: 'STK push sent successfully',
                transactionId: data.transactionId || data.id,
                data: data
            });
        } else {
            return res.status(200).json({
                success: false,
                message: data?.message || 'STK push failed'
            });
        }
    } catch (error) {
        console.error('Paylore error:', error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message || 'Internal server error'
        });
    }
};
