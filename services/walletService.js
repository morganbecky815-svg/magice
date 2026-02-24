// services/walletService.js
const { ethers } = require('ethers');
const CryptoJS = require('crypto-js');
const User = require('../models/User');

class WalletService {
    constructor() {
        console.log('🔧 WalletService initializing...');
        
        // Check encryption key
        this.encryptionKey = process.env.WALLET_ENCRYPTION_KEY;
        
        if (!this.encryptionKey) {
            console.error('❌ CRITICAL: WALLET_ENCRYPTION_KEY not set in .env');
            this.encryptionKey = 'fallback-insecure-key-do-not-use-in-production';
        } else {
            console.log(`🔑 Encryption key from env: ✅ Present (length: ${this.encryptionKey.length})`);
        }

        // Initialize provider
        if (process.env.ETH_NODE_URL) {
            this.provider = new ethers.JsonRpcProvider(process.env.ETH_NODE_URL);
            console.log('✅ Ethereum provider initialized');
        } else {
            console.error('❌ ETH_NODE_URL not set in .env');
        }
    }

    /**
     * Generate a new wallet for a user
     */
    generateUserWallet() {
        try {
            console.log('🪙 Generating new wallet...');
            
            // Create a random wallet using ethers v6
            const wallet = ethers.Wallet.createRandom();
            console.log(`✅ Wallet created with address: ${wallet.address}`);
            
            // Encrypt the private key
            const encryptedPrivateKey = CryptoJS.AES.encrypt(
                wallet.privateKey, 
                this.encryptionKey
            ).toString();
            
            console.log(`✅ Encrypted key generated (length: ${encryptedPrivateKey.length})`);
            
            // Test decryption immediately to verify
            try {
                const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, this.encryptionKey);
                const decrypted = bytes.toString(CryptoJS.enc.Utf8);
                console.log(`✅ Encryption test: ${decrypted === wallet.privateKey ? 'PASSED' : 'FAILED'}`);
            } catch (testError) {
                console.error('❌ Encryption test failed:', testError.message);
            }
            
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
     * IMPORTANT: This ensures the encrypted private key is selected
     */
    async getUserWallet(user) {
        try {
            console.log(`\n🔓 Getting wallet for user: ${user.email}`);
            
            // Step 1: Check if we have the user object with encrypted key
            let userWithKey = user;
            
            // If the user object doesn't have the encrypted key (due to select:false),
            // fetch it again with explicit selection
            if (!user.encryptedPrivateKey) {
                console.log(`   ⚠️ Encrypted key missing from user object - fetching from database...`);
                
                const freshUser = await User.findById(user._id).select('+encryptedPrivateKey');
                if (freshUser && freshUser.encryptedPrivateKey) {
                    userWithKey = freshUser;
                    console.log(`   ✅ Successfully fetched user with encrypted key`);
                } else {
                    console.error(`   ❌ Could not fetch encrypted key from database`);
                    throw new Error('User has no wallet');
                }
            }
            
            console.log(`   🔑 Has encrypted key: ${userWithKey.encryptedPrivateKey ? 'YES' : 'NO'}`);
            
            if (!userWithKey.encryptedPrivateKey) {
                console.error(`   ❌ User has no encrypted private key`);
                throw new Error('User has no wallet');
            }

            console.log(`   🔑 Encrypted key length: ${userWithKey.encryptedPrivateKey.length} characters`);
            console.log(`   🔑 Encrypted key preview: ${userWithKey.encryptedPrivateKey.substring(0, 30)}...`);

            // Step 2: Decrypt the private key
            console.log(`   🔓 Decrypting private key...`);
            console.log(`   🔑 Using encryption key length: ${this.encryptionKey.length}`);
            
            let bytes;
            try {
                bytes = CryptoJS.AES.decrypt(userWithKey.encryptedPrivateKey, this.encryptionKey);
            } catch (decryptError) {
                console.error(`   ❌ Decryption threw error:`, decryptError.message);
                throw new Error(`Decryption failed: ${decryptError.message}`);
            }
            
            const privateKey = bytes.toString(CryptoJS.enc.Utf8);
            
            if (!privateKey) {
                console.error(`   ❌ Decryption returned empty string`);
                console.error(`      This usually means the encryption key is WRONG`);
                console.error(`      Encryption key in .env must match the one used when user registered`);
                throw new Error('Failed to decrypt private key - encryption key mismatch');
            }
            
            console.log(`   ✅ Decryption successful`);
            console.log(`   🔑 Private key length: ${privateKey.length} characters`);

            // Step 3: Create wallet from private key
            console.log(`   🔑 Creating wallet from private key...`);
            const wallet = new ethers.Wallet(privateKey);
            
            console.log(`   ✅ Wallet recreated`);
            console.log(`   📍 Recovered address: ${wallet.address}`);
            console.log(`   📍 Database address: ${userWithKey.depositAddress}`);
            console.log(`   ✅ Addresses match: ${wallet.address === userWithKey.depositAddress ? 'YES' : 'NO'}`);
            
            if (wallet.address !== userWithKey.depositAddress) {
                console.error(`   ❌ Address mismatch! This should never happen with correct encryption`);
            }

            // Step 4: Attach provider
            if (this.provider) {
                return wallet.connect(this.provider);
            }
            
            return wallet;

        } catch (error) {
            console.error(`❌ Error in getUserWallet for ${user.email}:`, error.message);
            throw error;
        }
    }

    /**
     * Get balance of a deposit address
     */
    async getAddressBalance(address) {
        try {
            if (!this.provider) {
                throw new Error('No provider available');
            }
            const balance = await this.provider.getBalance(address);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('❌ Error getting balance:', error);
            return '0';
        }
    }

    /**
     * Verify a wallet exists and is valid
     */
    verifyWallet(address, encryptedPrivateKey) {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, this.encryptionKey);
            const privateKey = bytes.toString(CryptoJS.enc.Utf8);
            const wallet = new ethers.Wallet(privateKey);
            return wallet.address.toLowerCase() === address.toLowerCase();
        } catch (error) {
            console.error('❌ Wallet verification failed:', error);
            return false;
        }
    }
}

module.exports = new WalletService();