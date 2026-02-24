// services/sweepService.js - SWEEP ANY AMOUNT ABOVE ZERO
const { ethers } = require('ethers');
const User = require('../models/User');
const walletService = require('./walletService');

class SweepService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.ETH_NODE_URL);
        this.treasuryWallet = process.env.TREASURY_WALLET;
        
        if (!this.treasuryWallet) {
            console.warn('⚠️ TREASURY_WALLET not set in .env - sweeping disabled');
        }
    }

    /**
     * Sweep funds from a user's deposit address to treasury
     * Sweeps ANY amount above zero (no minimum threshold)
     */
    async sweepUser(user) {
        try {
            console.log(`🔍 Checking ${user.email} (${user.depositAddress})...`);

            // Get user's wallet
            const userWallet = await walletService.getUserWallet(user);
            
            // Check balance
            const balance = await userWallet.provider.getBalance(userWallet.address);
            
            // ⚡ SWEEP ANY AMOUNT ABOVE ZERO (no minimum)
            if (balance <= 0) {
                console.log(`   Balance: 0 ETH - nothing to sweep`);
                return null;
            }

            console.log(`💰 Found ${ethers.formatEther(balance)} ETH - sweeping...`);

            // Get fee data (v6)
            const feeData = await this.provider.getFeeData();
            const gasPrice = feeData.gasPrice;
            const gasLimit = 21000; // Standard ETH transfer
            const gasCost = gasPrice * BigInt(gasLimit);
            
            // Calculate amount to send (balance minus gas)
            const amountToSend = balance - gasCost;

            // Check if enough for gas
            if (amountToSend <= 0) {
                console.log(`   ⚠️ Balance too low for gas costs (need ${ethers.formatEther(gasCost)} ETH for gas)`);
                console.log(`   Keeping funds at address until gas prices drop or more ETH is deposited`);
                return null;
            }

            // Send to treasury
            const tx = await userWallet.sendTransaction({
                to: this.treasuryWallet,
                value: amountToSend,
                gasPrice: gasPrice,
                gasLimit: gasLimit
            });

            console.log(`✅ Swept ${ethers.formatEther(amountToSend)} ETH`);
            console.log(`   TX: ${tx.hash}`);

            // Update user record
            user.lastSweptAt = new Date();
            user.lastSweepAmount = parseFloat(ethers.formatEther(amountToSend));
            user.lastSweepTxHash = tx.hash;
            
            // Update internal balance (user sees this in their wallet)
            user.internalBalance = (user.internalBalance || 0) + parseFloat(ethers.formatEther(amountToSend));
            
            await user.save();

            return {
                tx,
                amount: ethers.formatEther(amountToSend),
                gasCost: ethers.formatEther(gasCost)
            };

        } catch (error) {
            console.error(`❌ Error sweeping user ${user.email}:`, error.message);
            return null;
        }
    }

    /**
     * Sweep all users - checks every user's deposit address
     */
    async sweepAll() {
        console.log('🔄 Starting sweep of all users at', new Date().toISOString());
        console.log('⚡ Sweeping ANY amount above zero (no minimum threshold)');
        
        const users = await User.find({
            depositAddress: { $exists: true },
            encryptedPrivateKey: { $exists: true }
        });

        console.log(`Found ${users.length} users to check`);

        const results = {
            swept: [],
            failed: [],
            skipped: []
        };

        for (const user of users) {
            try {
                const result = await this.sweepUser(user);
                if (result) {
                    results.swept.push({
                        email: user.email,
                        amount: result.amount,
                        gasCost: result.gasCost
                    });
                } else {
                    results.skipped.push(user.email);
                }
            } catch (error) {
                results.failed.push(user.email);
            }
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('✅ Sweep complete:');
        console.log(`   ✅ Swept: ${results.swept.length} users`);
        console.log(`   ⏭️  Skipped: ${results.skipped.length} users`);
        console.log(`   ❌ Failed: ${results.failed.length} users`);
        
        if (results.swept.length > 0) {
            console.log('📊 Swept amounts:');
            results.swept.forEach(r => {
                console.log(`   - ${r.email}: ${r.amount} ETH (gas: ${r.gasCost} ETH)`);
            });
        }
        
        return results;
    }

    /**
     * Get treasury balance
     */
    async getTreasuryBalance() {
        try {
            const balance = await this.provider.getBalance(this.treasuryWallet);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('Error getting treasury balance:', error);
            return '0';
        }
    }

    /**
     * Get balance for a specific address
     */
    async getAddressBalance(address) {
        try {
            const balance = await this.provider.getBalance(address);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('Error getting address balance:', error);
            return '0';
        }
    }
}

module.exports = new SweepService();