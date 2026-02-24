// services/sweepService.js - COMPLETE WITH SWEEP HISTORY TRACKING
const { ethers } = require('ethers');
const User = require('../models/User');
const walletService = require('./walletService');
const Sweep = require('../models/Sweep'); // ADD THIS

class SweepService {
    constructor() {
        console.log('\n' + '🔧'.repeat(20));
        console.log('🔧 INITIALIZING SWEEP SERVICE');
        console.log('🔧'.repeat(20) + '\n');
        
        // Check environment variables
        if (!process.env.ETH_NODE_URL) {
            console.error('❌ CRITICAL: ETH_NODE_URL not set in .env');
            console.error('   Sweep service will not work without this');
        } else {
            console.log('✅ ETH_NODE_URL found:', process.env.ETH_NODE_URL.substring(0, 30) + '...');
        }
        
        if (!process.env.TREASURY_WALLET) {
            console.error('❌ CRITICAL: TREASURY_WALLET not set in .env');
            console.error('   Sweep service will not work without this');
        } else {
            console.log('✅ TREASURY_WALLET found:', process.env.TREASURY_WALLET);
        }
        
        this.provider = new ethers.JsonRpcProvider(process.env.ETH_NODE_URL);
        this.treasuryWallet = process.env.TREASURY_WALLET;
        
        console.log('✅ Sweep service initialized\n');
    }

    async sweepUser(user) {
        try {
            console.log('\n' + '='.repeat(70));
            console.log(`🔍 PROCESSING USER: ${user.email}`);
            console.log('='.repeat(70));
            
            console.log(`📍 Deposit address: ${user.depositAddress}`);
            console.log(`🔑 Has encrypted key: ${user.encryptedPrivateKey ? '✅ YES' : '❌ NO'}`);
            console.log(`🔑 Encrypted key length: ${user.encryptedPrivateKey?.length || 0} characters`);

            // Step 1: Get wallet from encrypted key
            console.log(`\n📋 STEP 1: Getting wallet from encrypted key...`);
            let userWallet;
            try {
                userWallet = await walletService.getUserWallet(user);
                console.log(`   ✅ Wallet obtained successfully`);
                console.log(`   📍 Wallet address: ${userWallet.address}`);
                console.log(`   ✅ Matches DB address: ${userWallet.address === user.depositAddress ? 'YES' : 'NO'}`);
            } catch (walletError) {
                console.log(`   ❌ FAILED: ${walletError.message}`);
                console.log(`   🔴 Cannot proceed without wallet`);
                console.log(`   🔴 REASON: ${walletError.message.includes('decrypt') ? 'Encryption key mismatch' : 'Wallet error'}`);
                return null;
            }

            // Step 2: Check balance
            console.log(`\n📋 STEP 2: Checking balance...`);
            const balance = await userWallet.provider.getBalance(userWallet.address);
            const ethBalance = parseFloat(ethers.formatEther(balance));
            
            console.log(`   💰 Raw balance (wei): ${balance.toString()}`);
            console.log(`   💰 ETH balance: ${ethBalance} ETH`);

            if (ethBalance <= 0) {
                console.log(`   ⏭️  SKIPPING: Balance is 0 ETH - no funds to sweep`);
                return null;
            }
            console.log(`   ✅ Balance > 0, proceeding...`);

            // Step 3: Get gas prices
            console.log(`\n📋 STEP 3: Checking gas prices...`);
            const feeData = await this.provider.getFeeData();
            const gasPrice = feeData.gasPrice;
            const gasLimit = 21000; // Standard ETH transfer
            const gasCost = gasPrice * BigInt(gasLimit);
            const gasCostEth = parseFloat(ethers.formatEther(gasCost));
            
            console.log(`   ⛽ Gas price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
            console.log(`   ⛽ Gas price (wei): ${gasPrice.toString()}`);
            console.log(`   ⛽ Gas limit: ${gasLimit}`);
            console.log(`   ⛽ Total gas cost (wei): ${gasCost.toString()}`);
            console.log(`   ⛽ Total gas cost (ETH): ${gasCostEth} ETH`);

            // Step 4: Check if balance covers gas
            console.log(`\n📋 STEP 4: Checking if balance covers gas...`);
            console.log(`   💰 Balance: ${ethBalance} ETH`);
            console.log(`   ⛽ Gas needed: ${gasCostEth} ETH`);
            console.log(`   💰 Balance - Gas = ${(ethBalance - gasCostEth).toFixed(6)} ETH`);
            
            if (ethBalance <= gasCostEth) {
                console.log(`   ❌ INSUFFICIENT FOR GAS:`);
                console.log(`      Balance (${ethBalance} ETH) <= Gas cost (${gasCostEth} ETH)`);
                console.log(`      Shortage: ${(gasCostEth - ethBalance).toFixed(6)} ETH`);
                console.log(`   ⏭️  SKIPPING: Need more ETH or lower gas prices`);
                console.log(`   💡 TIP: Check https://etherscan.io/gastracker for lower gas prices`);
                return null;
            }
            console.log(`   ✅ Balance sufficient for gas (excess: ${(ethBalance - gasCostEth).toFixed(6)} ETH)`);

            // Step 5: Calculate amount to send
            const amountToSend = balance - gasCost;
            const amountToSendEth = parseFloat(ethers.formatEther(amountToSend));
            console.log(`\n📋 STEP 5: Calculating sweep amount...`);
            console.log(`   💰 Amount to send (wei): ${amountToSend.toString()}`);
            console.log(`   💰 Amount to send (ETH): ${amountToSendEth} ETH`);
            console.log(`   💰 User will be credited: ${amountToSendEth} ETH`);

            // Step 6: Send transaction
            console.log(`\n📋 STEP 6: Sending transaction to treasury...`);
            console.log(`   📍 Treasury address: ${this.treasuryWallet}`);
            console.log(`   🔑 Signing with user's wallet...`);
            
            try {
                const tx = await userWallet.sendTransaction({
                    to: this.treasuryWallet,
                    value: amountToSend,
                    gasPrice: gasPrice,
                    gasLimit: gasLimit
                });

                console.log(`   ✅ Transaction sent!`);
                console.log(`   🔗 Transaction hash: ${tx.hash}`);
                console.log(`   🔗 Etherscan: https://etherscan.io/tx/${tx.hash}`);
                console.log(`   ⏳ Waiting for confirmation...`);

                // Wait for confirmation
                const receipt = await tx.wait();
                console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
                console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
                console.log(`   ✅ Status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);

                // Step 7: Update user record
                console.log(`\n📋 STEP 7: Updating user record...`);
                user.lastSweptAt = new Date();
                user.lastSweepAmount = amountToSendEth;
                user.lastSweepTxHash = tx.hash;
                user.internalBalance = (user.internalBalance || 0) + amountToSendEth;
                
                await user.save();
                console.log(`   ✅ Last swept: ${user.lastSweptAt.toISOString()}`);
                console.log(`   ✅ Sweep amount: ${user.lastSweepAmount} ETH`);
                console.log(`   ✅ New internal balance: ${user.internalBalance} ETH`);

                // ===== STEP 8: SAVE SWEEP HISTORY =====
                console.log(`\n📋 STEP 8: Saving sweep history...`);
                try {
                    const Sweep = require('../models/Sweep');
                    
                    const sweepRecord = new Sweep({
                        userId: user._id,
                        userEmail: user.email,
                        depositAddress: user.depositAddress,
                        amount: amountToSendEth,
                        gasCost: gasCostEth,
                        transactionHash: tx.hash,
                        status: 'success',
                        sweptAt: new Date(),
                        blockNumber: receipt.blockNumber,
                        network: 'ethereum'
                    });
                    
                    await sweepRecord.save();
                    console.log(`   ✅ Sweep record saved to database`);
                    console.log(`   📊 Record ID: ${sweepRecord._id}`);
                    
                } catch (sweepError) {
                    console.error(`   ❌ Failed to save sweep record:`, sweepError.message);
                    // Don't fail the whole operation if just the record saving fails
                }

                console.log('\n' + '✅'.repeat(35));
                console.log(`✅✅✅ SWEEP COMPLETE FOR ${user.email}`);
                console.log(`✅✅✅ Swept ${amountToSendEth} ETH to treasury`);
                console.log('✅'.repeat(35) + '\n');

                return {
                    tx,
                    amount: amountToSendEth,
                    gasCost: gasCostEth
                };

            } catch (txError) {
                console.log(`   ❌ TRANSACTION FAILED:`);
                console.log(`      Error: ${txError.message}`);
                if (txError.code) console.log(`      Error code: ${txError.code}`);
                if (txError.reason) console.log(`      Reason: ${txError.reason}`);
                
                // Save failed attempt
                try {
                    const Sweep = require('./models/Sweep');
                    const sweepRecord = new Sweep({
                        userId: user._id,
                        userEmail: user.email,
                        depositAddress: user.depositAddress,
                        amount: amountToSendEth,
                        gasCost: gasCostEth,
                        transactionHash: 'failed-' + Date.now(),
                        status: 'failed',
                        sweptAt: new Date(),
                        network: 'ethereum'
                    });
                    await sweepRecord.save();
                } catch (recordError) {
                    // Ignore
                }
                
                return null;
            }

        } catch (error) {
            console.error(`\n❌❌❌ UNEXPECTED ERROR for ${user.email}:`);
            console.error(`   Error: ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
            return null;
        }
    }

    async sweepAll() {
        console.log('\n' + '🟦'.repeat(40));
        console.log(`🟦 SWEEP CYCLE STARTING AT ${new Date().toISOString()}`);
        console.log('🟦'.repeat(40) + '\n');
        
        // IMPORTANT: Select the encryptedPrivateKey field explicitly
        const users = await User.find({
            depositAddress: { $exists: true },
            encryptedPrivateKey: { $exists: true }
        }).select('+encryptedPrivateKey');

        console.log(`📊 Found ${users.length} users to check`);
        console.log(`   (Encrypted keys are selected: YES)\n`);

        let swept = 0;
        let skipped = 0;
        let failed = 0;
        let totalSweptAmount = 0;

        for (const user of users) {
            try {
                const result = await this.sweepUser(user);
                if (result) {
                    swept++;
                    totalSweptAmount += result.amount;
                } else {
                    skipped++;
                }
            } catch (error) {
                console.log(`❌ Fatal error for ${user.email}:`, error.message);
                failed++;
            }
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\n' + '🟩'.repeat(40));
        console.log(`🟩 SWEEP CYCLE COMPLETE`);
        console.log(`   ✅ Swept: ${swept} users`);
        console.log(`   💰 Total swept: ${totalSweptAmount.toFixed(4)} ETH`);
        console.log(`   ⏭️  Skipped: ${skipped} users`);
        console.log(`   ❌ Failed: ${failed} users`);
        console.log('🟩'.repeat(40) + '\n');

        return { swept, skipped, failed, totalSweptAmount };
    }

    async getTreasuryBalance() {
        try {
            const balance = await this.provider.getBalance(this.treasuryWallet);
            const ethBalance = ethers.formatEther(balance);
            console.log(`💰 Treasury balance: ${ethBalance} ETH`);
            return ethBalance;
        } catch (error) {
            console.error('❌ Error getting treasury balance:', error);
            return '0';
        }
    }

    async getAddressBalance(address) {
        try {
            const balance = await this.provider.getBalance(address);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('❌ Error getting address balance:', error);
            return '0';
        }
    }
}

module.exports = new SweepService();