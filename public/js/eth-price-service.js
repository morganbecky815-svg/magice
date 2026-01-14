// /public/js/eth-price-service.js
class EthPriceService {
    constructor() {
      this.currentPrice = 2500;
      this.lastUpdated = 0;
      this.cacheDuration = 30000; // 30 seconds
      this.isFetching = false;
      this.listeners = new Set();
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
        
        return this.currentPrice;
        
      } catch (error) {
        console.warn('Failed to fetch ETH price:', error);
        
        // Use localStorage as fallback cache
        const cached = localStorage.getItem('ethPriceCache');
        if (cached) {
          const { price, timestamp } = JSON.parse(cached);
          if (now - timestamp < 300000) { // 5 minutes
            this.currentPrice = price;
          }
        }
        
        return this.currentPrice;
      } finally {
        this.isFetching = false;
      }
    }
    
    // Update all displays on the page
    async updateAllDisplays() {
      const price = await this.getPrice();
      
      // Update global variable
      window.ETH_PRICE = price;
      
      // Update all price displays
      this.updatePriceDisplays(price);
      
      // Store in localStorage as backup
      localStorage.setItem('ethPriceCache', JSON.stringify({
        price: price,
        timestamp: Date.now()
      }));
      
      return price;
    }
    
    // Update DOM elements with price
    updatePriceDisplays(price) {
      // Update data attributes
      document.querySelectorAll('[data-eth-price]').forEach(el => {
        const ethAmount = parseFloat(el.getAttribute('data-eth-amount') || 0);
        el.textContent = `$${(ethAmount * price).toFixed(2)}`;
      });
      
      // Update specific elements
      const elements = [
        'currentEthPrice',
        'ethPriceDisplay', 
        'dashboardEthPrice',
        'marketplaceEthPrice'
      ];
      
      elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.textContent = `$${price}`;
        }
      });
    }
    
    // Subscribe to price updates
    subscribe(callback) {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    }
    
    notifyListeners() {
      this.listeners.forEach(callback => {
        callback(this.currentPrice);
      });
    }
    
    // Start periodic updates
    startAutoRefresh(interval = 60000) { // 1 minute
      if (this.intervalId) clearInterval(this.intervalId);
      
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
    }
  }
  
  // Create global instance
  window.ethPriceService = new EthPriceService();
  
  // Initialize on page load
  document.addEventListener('DOMContentLoaded', () => {
    // Load price after a short delay
    setTimeout(() => {
      window.ethPriceService.updateAllDisplays();
    }, 1000);
    
    // Start auto-refresh
    window.ethPriceService.startAutoRefresh();
  });