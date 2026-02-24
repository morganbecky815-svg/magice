const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const sweepService = require('../services/sweepService'); // ADD THIS

// ===== GET DEPOSIT INFORMATION (UPDATED with custodial wallet) =====
router.get('/info', auth, async (req, res) => {
  try {
    const user = req.user;
    
    // Get current balance of deposit address (optional)
    let addressBalance = '0';
    try {
      addressBalance = await sweepService.getAddressBalance(user.depositAddress);
    } catch (error) {
      console.log('Could not fetch live balance:', error.message);
    }
    
    res.json({
      success: true,
      message: 'Send ETH to this address',
      depositAddress: user.depositAddress, // User's unique deposit address
      internalBalance: user.internalBalance, // Their spendable balance in your platform
      addressBalance: addressBalance, // Current balance on the blockchain (may include un-swept funds)
      network: process.env.ETH_NETWORK || 'mainnet',
      warning: 'Only send ETH on Ethereum network. Funds will be automatically credited to your account.',
      note: 'Your deposit address is unique to you. Always use this exact address.'
    });
  } catch (error) {
    console.error('Error getting deposit info:', error);
    res.status(500).json({ error: 'Failed to get deposit information' });
  }
});

// ===== GET DEPOSIT ADDRESS ONLY (UPDATED) =====
router.get('/address', auth, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      depositAddress: user.depositAddress
    });
  } catch (error) {
    console.error('Error getting deposit address:', error);
    res.status(500).json({ error: 'Failed to get deposit address' });
  }
});

// ===== GET TRANSACTION HISTORY (OPTIONAL) =====
router.get('/history', auth, async (req, res) => {
  try {
    const user = req.user;
    
    // You would implement this to show past sweeps
    // For now, return basic info
    res.json({
      success: true,
      history: [
        {
          type: 'deposit_address',
          address: user.depositAddress,
          created: user.createdAt
        }
      ],
      lastSweptAt: user.lastSweptAt,
      lastSweepAmount: user.lastSweepAmount,
      lastSweepTxHash: user.lastSweepTxHash
    });
  } catch (error) {
    console.error('Error getting deposit history:', error);
    res.status(500).json({ error: 'Failed to get deposit history' });
  }
});

module.exports = router;