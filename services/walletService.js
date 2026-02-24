// services/walletService.js - ETHERs v6 VERSION
const { ethers } = require('ethers');  // ✅ v6 syntax - notice the { }
const CryptoJS = require('crypto-js');

class WalletService {
    constructor() {
        // Initialize provider
        const nodeUrl = process.env.ETH_NODE_URL || 'https://cloudflare-eth.com';
        this.provider = new ethers.JsonRpcProvider(nodeUrl);  // ✅ v6: no .providers
        
        this.encryptionKey = process.env.WALLET_ENCRYPTION_KEY;
        
        if (!this.encryptionKey) {
            console.warn('⚠️ WALLET_ENCRYPTION_KEY not set in .env - using default (INSECURE!)');
            this.encryptionKey = 'default-insecure-key-change-this-in-production';
        }
        
        console.log('✅ WalletService initialized with provider');
    }

    /**
     * Generate a new wallet for a user
     */
    generateUserWallet() {
        try {
            // Create a random wallet using ethers v6
            const wallet = ethers.Wallet.createRandom();
            
            // Encrypt the private key
            const encryptedPrivateKey = CryptoJS.AES.encrypt(
                wallet.privateKey, 
                this.encryptionKey
            ).toString();
            
            return {
                address: wallet.address,
                encryptedPrivateKey,
            };
        } catch (error) {
            console.error('❌ Error generating wallet:', error);
            throw new Error('Failed to generate wallet');
        }
    }

    /**
     * Get wallet instance for a user (for sweeping)
     */
    async getUserWallet(user) {
        try {
            if (!user.encryptedPrivateKey) {
                throw new Error('User has no wallet');
            }

            // Decrypt private key
            const bytes = CryptoJS.AES.decrypt(user.encryptedPrivateKey, this.encryptionKey);
            const privateKey = bytes.toString(CryptoJS.enc.Utf8);
            
            if (!privateKey) {
                throw new Error('Failed to decrypt private key');
            }

            // Create wallet instance with provider (v6 syntax)
            return new ethers.Wallet(privateKey, this.provider);
        } catch (error) {
            console.error('❌ Error getting user wallet:', error);
            throw error;
        }
    }

    /**
     * Get balance of a deposit address
     */
    async getAddressBalance(address) {
        try {
            const balance = await this.provider.getBalance(address);
            return ethers.formatEther(balance);  // ✅ v6: formatEther instead of utils.formatEther
        } catch (error) {
            console.error('❌ Error getting balance:', error);
            return '0';
        }
    }

    /**
     * Sweep funds from a user wallet to treasury
     */
    async sweepToTreasury(userWallet, treasuryAddress) {
        try {
            const balance = await userWallet.provider.getBalance(userWallet.address);
            
            // Get fee data (v6)
            const feeData = await userWallet.provider.getFeeData();
            const gasPrice = feeData.gasPrice;
            const gasLimit = 21000;
            const gasCost = gasPrice * BigInt(gasLimit);
            
            const amountToSend = balance - gasCost;
            
            if (amountToSend <= 0) {
                return { success: false, reason: 'Insufficient balance for gas' };
            }

            const tx = await userWallet.sendTransaction({
                to: treasuryAddress,
                value: amountToSend,
                gasPrice: gasPrice,
                gasLimit: gasLimit
            });

            return {
                success: true,
                txHash: tx.hash,
                amount: ethers.formatEther(amountToSend)
            };
        } catch (error) {
            console.error('❌ Error sweeping to treasury:', error);
            throw error;
        }
    }
}

module.exports = new WalletService();