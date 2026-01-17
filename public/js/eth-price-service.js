/**
 * EthPriceService.js
 * Real-time Ethereum price tracker for web applications
 * Automatically updates ETH prices across all pages
 */

class EthPriceService {
  constructor() {
    this.currentPrice = 2500; // Default fallback price
    this.lastUpdated = 0;
    this.cacheDuration = 30000; // 30 seconds cache
    this.isFetching = false;
    this.listeners = new Set();
    this.observer = null;
    
    // Initialize dynamic content observer
    this.setupDynamicObserver();
    
    // Load cached price from localStorage if available
    this.loadCachedPrice();
  }
  
  // Load price from localStorage on initialization
  loadCachedPrice() {
    try {
      const cached = localStorage.getItem('ethPriceCache');
      if (cached) {
        const { price, timestamp } = JSON.parse(cached);
        const now = Date.now();
        // Use cache if less than 5 minutes old
        if (now - timestamp < 300000) {
          this.currentPrice = price;
          this.lastUpdated = timestamp;
        }
      }
    } catch (error) {
      console.warn('Failed to load cached price:', error);
    }
  }
  
  // Get price with intelligent caching
  async getPrice() {
    const now = Date.now();
    
    // Return cached price if still valid
    if (now - this.lastUpdated < this.cacheDuration && this.currentPrice) {
      return this.currentPrice;
    }
    
    // Prevent multiple simultaneous fetches
    if (this.isFetching) {
      return new Promise(resolve => {
        const check = () => {
          if (!this.isFetching) {
            resolve(this.currentPrice);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    }
    
    this.isFetching = true;
    
    try {
      console.log('🔄 Fetching ETH price from backend...');
      
      const response = await fetch('/api/eth-price', {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }
      
      const data = await response.json();
      this.currentPrice = data.price;
      this.lastUpdated = now;
      
      // Notify all listeners
      this.notifyListeners();
      
      // Update all displays
      this.updatePriceDisplays(this.currentPrice);
      
      return this.currentPrice;
      
    } catch (error) {
      console.warn('Failed to fetch ETH price:', error);
      
      // Use localStorage as fallback cache
      const cached = localStorage.getItem('ethPriceCache');
      if (cached) {
        const { price, timestamp } = JSON.parse(cached);
        if (now - timestamp < 300000) { // 5 minutes
          this.currentPrice = price;
          this.updatePriceDisplays(this.currentPrice);
        }
      }
      
      return this.currentPrice;
    } finally {
      this.isFetching = false;
    }
  }
  
  // Universal DOM updater for all pages
  updatePriceDisplays(price) {
    const formattedPrice = `$${price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
    
    // Format with 2 decimal places for calculations
    const priceNumber = parseFloat(price);
    
    // === METHOD 1: CSS Classes (Easiest - Use this in HTML) ===
    const priceClasses = [
      'eth-price',
      'live-eth-price',
      'eth-price-display',
      'ethereum-price',
      'crypto-price-ticker'
    ];
    
    priceClasses.forEach(className => {
      document.querySelectorAll(`.${className}`).forEach(el => {
        if (el.textContent !== formattedPrice) {
          el.textContent = formattedPrice;
          el.classList.add('price-updated');
          setTimeout(() => el.classList.remove('price-updated'), 1000);
        }
      });
    });
    
    // === METHOD 2: Data Attributes (For ETH-to-USD conversion) ===
    document.querySelectorAll('[data-eth-price]').forEach(el => {
      const ethAmount = parseFloat(el.getAttribute('data-eth-amount') || 1);
      const usdValue = ethAmount * priceNumber;
      const formattedUSD = `$${usdValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
      
      if (el.textContent !== formattedUSD) {
        el.textContent = formattedUSD;
        el.classList.add('price-updated');
        setTimeout(() => el.classList.remove('price-updated'), 1000);
      }
    });
    
    // === METHOD 3: Common Element IDs ===
    const elementIds = [
      'currentEthPrice', 'ethPriceDisplay', 'navEthPrice',
      'headerEthPrice', 'footerEthPrice', 'sidebarEthPrice',
      'ethPrice', 'ethereumPrice', 'cryptoPrice',
      'priceTicker', 'marketPrice', 'livePrice'
    ];
    
    elementIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.textContent !== formattedPrice) {
        el.textContent = formattedPrice;
        el.classList.add('price-updated');
        setTimeout(() => el.classList.remove('price-updated'), 1000);
      }
    });
    
    // === METHOD 4: Update timestamp display ===
    const timeElements = document.querySelectorAll('.price-updated-time, .last-updated');
    if (timeElements.length > 0) {
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      timeElements.forEach(el => {
        el.textContent = timeString;
      });
    }
    
    // === METHOD 5: Update input placeholders ===
    document.querySelectorAll('input[data-eth-placeholder]').forEach(input => {
      const ethAmount = parseFloat(input.getAttribute('data-eth-placeholder') || 1);
      const usdValue = ethAmount * priceNumber;
      input.placeholder = `≈ $${usdValue.toFixed(2)} USD`;
    });
    
    // Update global variable
    window.ETH_PRICE = priceNumber;
  }
  
  // Update all displays on the page
  async updateAllDisplays() {
    const price = await this.getPrice();
    
    // Store in localStorage as backup
    localStorage.setItem('ethPriceCache', JSON.stringify({
      price: price,
      timestamp: Date.now()
    }));
    
    return price;
  }
  
  // Setup observer for dynamically added content
  setupDynamicObserver() {
    this.observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        // Check if new nodes contain price-related elements
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            if (node.classList && (
              node.classList.contains('eth-price') ||
              node.classList.contains('live-eth-price') ||
              node.hasAttribute('data-eth-price')
            )) {
              shouldUpdate = true;
            }
            
            // Check child elements
            if (node.querySelectorAll) {
              const priceElements = node.querySelectorAll(
                '.eth-price, .live-eth-price, [data-eth-price]'
              );
              if (priceElements.length > 0) {
                shouldUpdate = true;
              }
            }
          }
        });
      });
      
      // Update prices if new elements were added
      if (shouldUpdate && this.currentPrice) {
        this.updatePriceDisplays(this.currentPrice);
      }
    });
    
    // Start observing the document
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Subscribe to price updates
  subscribe(callback) {
    this.listeners.add(callback);
    // Immediately call with current price
    if (this.currentPrice) {
      setTimeout(() => callback(this.currentPrice), 0);
    }
    return () => this.listeners.delete(callback);
  }
  
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentPrice);
      } catch (error) {
        console.error('Error in price listener:', error);
      }
    });
  }
  
  // Start periodic updates
  startAutoRefresh(interval = 60000) { // 1 minute default
    if (this.intervalId) clearInterval(this.intervalId);
    
    // Update immediately
    this.updateAllDisplays();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.updateAllDisplays();
    }, interval);
    
    // Also update when tab becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateAllDisplays();
      }
    });
  }
  
  // Stop updates
  stopAutoRefresh() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Remove visibility change listener
    document.removeEventListener('visibilitychange', () => {});
  }
  
  // Get current price without fetching
  getCurrentPrice() {
    return this.currentPrice;
  }
  
  // Manually set price (for testing)
  setPrice(price) {
    this.currentPrice = price;
    this.lastUpdated = Date.now();
    this.updatePriceDisplays(price);
    this.notifyListeners();
  }
  
  // Convert ETH to USD
  convertToUSD(ethAmount) {
    return ethAmount * (this.currentPrice || 2500);
  }
  
  // Format USD value
  formatUSD(value) {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
}

// Create global instance
window.ethPriceService = new EthPriceService();

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Load price after a short delay
  setTimeout(() => {
    window.ethPriceService.updateAllDisplays();
  }, 500);
  
  // Start auto-refresh
  window.ethPriceService.startAutoRefresh();
});

// Also initialize if script loads after DOMContentLoaded
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  setTimeout(() => {
    window.ethPriceService.updateAllDisplays();
    window.ethPriceService.startAutoRefresh();
  }, 500);
}