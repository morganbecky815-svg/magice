// services/sweepService.js - ETHERs v6 VERSION
const { ethers } = require('ethers');  // ✅ v6 syntax
const User = require('../models/User');
const walletService = require('./walletService');

class SweepService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.ETH_NODE_URL);  // ✅ v6: no .providers
        this.treasuryWallet = process.env.TREASURY_WALLET;
        this.minSweepAmount = ethers.parseEther(process.env.MIN_SWEEP_AMOUNT || '0.01');  // ✅ v6: parseEther
        
        if (!this.treasuryWallet) {
            console.warn('⚠️ TREASURY_WALLET not set in .env - sweeping disabled');
        }
    }

    /**
     * Sweep funds from a user's deposit address to treasury
     */
    async sweepUser(user) {
        try {
            console.log(`🔍 Checking ${user.email} (${user.depositAddress})...`);

            // Get user's wallet
            const userWallet = await walletService.getUserWallet(user);
            
            // Check balance
            const balance = await userWallet.provider.getBalance(userWallet.address);
            
            if (balance < this.minSweepAmount) {
                console.log(`   Balance: ${ethers.formatEther(balance)} ETH (below threshold)`);  // ✅ v6: formatEther
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

            if (amountToSend <= 0) {
                console.log(`   Insufficient for gas`);
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
            
            // Update internal balance
            user.internalBalance = (user.internalBalance || 0) + parseFloat(ethers.formatEther(amountToSend));
            
            await user.save();

            return tx;

        } catch (error) {
            console.error(`❌ Error sweeping user ${user.email}:`, error.message);
            return null;
        }
    }

    /**
     * Sweep all users
     */
    async sweepAll() {
        console.log('🔄 Starting sweep of all users at', new Date().toISOString());
        
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
                const tx = await this.sweepUser(user);
                if (tx) {
                    results.swept.push(user.email);
                } else {
                    results.skipped.push(user.email);
                }
            } catch (error) {
                results.failed.push(user.email);
            }
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('✅ Sweep complete:', results);
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