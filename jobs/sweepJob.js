// jobs/sweepJob.js
const cron = require('node-cron');
const sweepService = require('../services/sweepService');

// Run every 3 minutes
cron.schedule('*/3 * * * *', async () => {
    console.log('⏰ Running scheduled sweep job at', new Date().toISOString());
    const startTime = Date.now();
    
    try {
        const results = await sweepService.sweepAll();
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`✅ Sweep job completed in ${duration}s`);
        if (results.swept.length > 0) {
            console.log(`   Swept ${results.swept.length} users`);
        }
    } catch (error) {
        console.error('❌ Sweep job failed:', error);
    }
});

console.log('🔄 Sweep job scheduled to run every 3 minutes');

// Export for manual triggering
module.exports = sweepService;