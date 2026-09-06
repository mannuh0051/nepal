// api/status.js
const axios = require('axios');

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // --- Only GET requests ---
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { transactionId } = req.query;
    if (!transactionId) {
        return res.status(400).json({ success: false, message: 'transactionId is required' });
    }

    // --- Environment variables ---
    const API_KEY = process.env.PAYLORE_API_KEY;
    const PAYLOR_BASE = 'https://api.paylorke.com/api/v1';

    if (!API_KEY) {
        return res.status(500).json({ success: false, message: 'Missing Paylore API key' });
    }

    try {
        const response = await axios.get(
            `${PAYLOR_BASE}/merchants/payments/transactions/${transactionId}`,
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = response.data;
        // Adjust the status field based on Paylore's actual response
        // Typical status values: "SUCCESS", "FAILED", "PENDING"
        return res.status(200).json({
            success: true,
            status: data.status,        // e.g., "SUCCESS"
            message: data.message,
            data: data
        });
    } catch (error) {
        console.error('Status check error:', error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message || 'Failed to fetch status'
        });
    }
};
