// api/status.js
const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { transactionId } = req.query;
    if (!transactionId) {
        return res.status(400).json({ success: false, message: 'transactionId is required' });
    }

    const API_KEY = process.env.PAYLORE_API_KEY;
    if (!API_KEY) {
        return res.status(500).json({ success: false, message: 'Missing Paylore API key' });
    }

    // Hardcoded endpoint
    const PAYLOR_BASE = 'https://api.paylorke.com/api/v1';
    const STATUS_ENDPOINT = `${PAYLOR_BASE}/merchants/payments/transactions/${transactionId}`;

    try {
        const response = await axios.get(STATUS_ENDPOINT, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;
        // Paylor returns: { id, reference, amount, status, provider, providerRef, metadata }
        return res.status(200).json({
            success: true,
            transactionId: data.id,
            reference: data.reference,
            amount: data.amount,
            status: data.status,   // "COMPLETED", "PENDING", "FAILED"
            provider: data.provider,
            providerRef: data.providerRef,
            metadata: data.metadata,
            message: 'Status retrieved'
        });

    } catch (error) {
        console.error('Paylor status error:', error.response?.data || error.message);
        const statusCode = error.response?.status || 500;
        const message = error.response?.data?.message || error.message || 'Failed to fetch status';
        return res.status(statusCode).json({
            success: false,
            message: message
        });
    }
};
