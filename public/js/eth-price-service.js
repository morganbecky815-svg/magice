/**
 * EthPriceService.js - Improved Version
 * Real-time Ethereum price tracker for web applications
 */

class EthPriceService {
  constructor(options = {}) {
    this.currentPrice = 2000;
    this.lastUpdated = 0;
    this.cacheDuration = options.cacheDuration || 30000;
    this.apiEndpoint = options.apiEndpoint || '/api/eth-price';
    this.isFetching = false;
    this.listeners = new Set();
    this.observer = null;
    this.retryAttempts = options.retryAttempts || 3;
    this._lastNotifiedPrice = null;
    
    this.loadCachedPrice();
    this.setupDynamicObserver();
  }
  
  loadCachedPrice() {
    try {
      const cached = localStorage.getItem('ethPriceCache');
      if (cached) {
        const { price, timestamp } = JSON.parse(cached);
        const now = Date.now();
        if (now - timestamp < 300000) { // 5 minutes
          this.currentPrice = price;
          this.lastUpdated = timestamp;
        }
      }
    } catch (error) {
      console.warn('Failed to load cached price:', error);
    }
  }
  
  async fetchWithRetry(attempts = this.retryAttempts) {
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await fetch(this.apiEndpoint, {
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        if (i === attempts - 1) throw error;
        
        // Exponential backoff
        const delay = Math.pow(2, i) * 1000;
        console.log(`Retry ${i + 1}/${attempts} in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  
  async getPrice() {
    const now = Date.now();
    
    if (now - this.lastUpdated < this.cacheDuration && this.currentPrice) {
      return this.currentPrice;
    }
    
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
      
      const data = await this.fetchWithRetry();
      
      if (!data || !data.price) {
        throw new Error('Invalid price data');
      }
      
      this.currentPrice = data.price;
      this.lastUpdated = now;
      
      localStorage.setItem('ethPriceCache', JSON.stringify({
        price: this.currentPrice,
        timestamp: now
      }));
      
      this.notifyListeners();
      this.updatePriceDisplays(this.currentPrice);
      
      return this.currentPrice;
      
    } catch (error) {
      console.warn('Failed to fetch ETH price:', error);
      
      const cached = localStorage.getItem('ethPriceCache');
      if (cached) {
        const { price, timestamp } = JSON.parse(cached);
        if (now - timestamp < 300000) {
          this.currentPrice = price;
          this.updatePriceDisplays(this.currentPrice);
        }
      }
      
      return this.currentPrice;
    } finally {
      this.isFetching = false;
    }
  }
  
  formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }
  
  updatePriceDisplays(price) {
    const formattedPrice = this.formatPrice(price);
    const priceNumber = parseFloat(price);
    
    // Update by CSS classes
    const priceClasses = ['eth-price', 'live-eth-price', 'eth-price-display'];
    priceClasses.forEach(className => {
      document.querySelectorAll(`.${className}`).forEach(el => {
        if (el.textContent !== formattedPrice) {
          el.textContent = formattedPrice;
          this.addUpdateEffect(el);
        }
      });
    });
    
    // Update by data attributes
    document.querySelectorAll('[data-eth-price]').forEach(el => {
      const ethAmount = parseFloat(el.getAttribute('data-eth-amount') || 1);
      const usdValue = ethAmount * priceNumber;
      const formattedUSD = this.formatPrice(usdValue);
      
      if (el.textContent !== formattedUSD) {
        el.textContent = formattedUSD;
        this.addUpdateEffect(el);
      }
    });
    
    // Update by IDs
    const elementIds = ['currentEthPrice', 'ethPriceDisplay', 'navEthPrice'];
    elementIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.textContent !== formattedPrice) {
        el.textContent = formattedPrice;
        this.addUpdateEffect(el);
      }
    });
    
    // Update timestamps
    document.querySelectorAll('.price-updated-time, .last-updated').forEach(el => {
      const now = new Date();
      el.textContent = now.toLocaleTimeString();
    });
    
    window.ETH_PRICE = priceNumber;
  }
  
  addUpdateEffect(el) {
    el.classList.add('price-updated');
    setTimeout(() => el.classList.remove('price-updated'), 1000);
  }
  
  setupDynamicObserver() {
    this.observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.classList?.contains('eth-price') || 
                node.hasAttribute?.('data-eth-price')) {
              shouldUpdate = true;
            }
            
            if (node.querySelectorAll) {
              const priceElements = node.querySelectorAll(
                '.eth-price, [data-eth-price]'
              );
              if (priceElements.length > 0) shouldUpdate = true;
            }
          }
        });
      });
      
      if (shouldUpdate && this.currentPrice) {
        this.updatePriceDisplays(this.currentPrice);
      }
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  subscribe(callback) {
    this.listeners.add(callback);
    if (this.currentPrice) {
      setTimeout(() => callback(this.currentPrice, this._lastNotifiedPrice), 0);
    }
    return () => this.listeners.delete(callback);
  }
  
  unsubscribe(callback) {
    this.listeners.delete(callback);
  }
  
  notifyListeners() {
    const oldPrice = this._lastNotifiedPrice;
    this.listeners.forEach(callback => {
      try {
        callback(this.currentPrice, oldPrice);
      } catch (error) {
        console.error('Error in price listener:', error);
      }
    });
    this._lastNotifiedPrice = this.currentPrice;
  }
  
  startAutoRefresh(interval = 60000) {
    if (this.intervalId) clearInterval(this.intervalId);
    
    this.updateAllDisplays();
    
    this.intervalId = setInterval(() => {
      this.updateAllDisplays();
    }, interval);
    
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }
  
  handleVisibilityChange = () => {
    if (!document.hidden) {
      this.updateAllDisplays();
    }
  };
  
  stopAutoRefresh() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
  
  destroy() {
    this.stopAutoRefresh();
    this.observer?.disconnect();
    this.listeners.clear();
    this._lastNotifiedPrice = null;
  }
  
  async updateAllDisplays() {
    return await this.getPrice();
  }
  
  getCurrentPrice() {
    return this.currentPrice;
  }
  
  setPrice(price) {
    this.currentPrice = price;
    this.lastUpdated = Date.now();
    this.updatePriceDisplays(price);
    this.notifyListeners();
    
    localStorage.setItem('ethPriceCache', JSON.stringify({
      price: price,
      timestamp: Date.now()
    }));
  }
  
  convertToUSD(ethAmount) {
    return ethAmount * (this.currentPrice ||2000 );
  }
}

// Create and initialize
window.ethPriceService = new EthPriceService();

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.ethPriceService.updateAllDisplays();
    window.ethPriceService.startAutoRefresh();
  });
} else {
  setTimeout(() => {
    window.ethPriceService.updateAllDisplays();
    window.ethPriceService.startAutoRefresh();
  }, 500);
}