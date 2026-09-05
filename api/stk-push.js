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
    const PAYLORE_API_KEY = process.env.PAYLORE_API_KEY;
    const PAYLORE_CHANNEL_ID = process.env.PAYLORE_CHANNEL_ID;
    const PAYLORE_API_URL ='https://api.paylore.com/v1';
    if (!PAYLORE_API_KEY || !PAYLORE_CHANNEL_ID) {
        return res.status(500).json({ success: false, message: 'Missing Paylore credentials' });
    }

    try {
        // Paylore STK Push payload (adjust fields based on Paylore documentation)
        const payload = {
            channelId: PAYLORE_CHANNEL_ID,
            phoneNumber: phone,
            amount: amount,
            reference: accountReference || 'DRRClaim',
            description: transactionDesc || 'Processing fee',
            // Include any additional required fields here
        };

        // Make the STK push request to Paylore
        const response = await axios.post(
            `${PAYLORE_API_URL}/stk/push`, // Replace with actual endpoint
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${PAYLORE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Check Paylore response structure (adjust as needed)
        if (response.data && response.data.success !== false) {
            return res.status(200).json({
                success: true,
                message: 'STK push sent successfully',
                data: response.data
            });
        } else {
            return res.status(200).json({
                success: false,
                message: response.data?.message || 'STK push failed'
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
