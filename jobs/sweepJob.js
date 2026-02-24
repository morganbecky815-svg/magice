// jobs/sweepJob.js
const cron = require('node-cron');
const sweepService = require('../services/sweepService');

// Run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
    console.log('⏰ Running scheduled sweep job at', new Date().toISOString());
    const startTime = Date.now();
    
    try {
        const results = await sweepService.sweepAll();
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`✅ Sweep job completed in ${duration}s`);
    } catch (error) {
        console.error('❌ Sweep job failed:', error);
    }
});

console.log('🔄 Sweep job scheduled to run every 15 minutes');

// Export for manual triggering
module.exports = sweepService;