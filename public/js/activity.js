// js/activity.js - USER ACTIVITY VERSION

// ============================================
// GLOBAL VARIABLES
// ============================================

// Store all activities for filtering
let allActivities = [];
let currentFilter = 'all';

// ============================================
// INITIALIZATION
// ============================================

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Activity page initialized - USER ACTIVITY');
    
    // 1. Load and display user info
    loadAndDisplayUserInfo();
    
    // 2. Load USER activity (not marketplace)
    loadUserActivity();
    
    // 3. Setup event listeners
    setupActivityEventListeners();
});

// ============================================
// USER INFO MANAGEMENT
// ============================================

// Display user info in activity page
async function loadAndDisplayUserInfo() {
    const userInfoDiv = document.getElementById('userInfo');
    if (!userInfoDiv) {
        console.error('❌ #userInfo element not found');
        return;
    }
    
    console.log('🔄 Loading user info for activity page...');
    
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('⬜ No token - showing login button');
        userInfoDiv.innerHTML = `
            <a href="/login" class="login-btn">
                <i class="fas fa-sign-in-alt"></i> Login
            </a>
        `;
        return;
    }
    
    // Try to get fresh data from API
    let user = null;
    try {
        console.log('📤 Fetching fresh user data...');
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
                user = data.user;
                // Update localStorage
                localStorage.setItem('user', JSON.stringify(user));
                console.log('✅ Fresh user data loaded:', user.email);
            }
        }
    } catch (error) {
        console.error('API fetch failed, using localStorage:', error.message);
    }
    
    // If API failed, try localStorage
    if (!user) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                user = JSON.parse(userStr);
                console.log('📦 Using localStorage user data');
            } catch (e) {
                console.error('Failed to parse localStorage user:', e);
            }
        }
    }
    
    if (user) {
        const displayName = user.fullName || user.email || 'User';
        const balance = user.balance || user.wethBalance || 0;
        
        console.log(`✅ Displaying user: ${displayName} (${balance} WETH)`);
        
        userInfoDiv.innerHTML = `
            <div class="activity-user-info">
                <i class="fas fa-user-circle user-avatar"></i>
                <span class="user-name">${displayName}</span>
                <span class="user-balance">${balance} WETH</span>
                <button class="logout-btn" onclick="logoutFromActivityPage()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        `;
    } else {
        console.log('⬜ No user data available');
        userInfoDiv.innerHTML = `
            <a href="/login" class="login-btn">
                <i class="fas fa-sign-in-alt"></i> Login
            </a>
        `;
    }
}

// ============================================
// USER ACTIVITY MANAGEMENT
// ============================================

// Load USER'S activity (not marketplace)
async function loadUserActivity() {
    try {
        console.log('📊 Loading YOUR activity...');
        
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (!token || !userStr) {
            throw new Error('Please login to view your activity');
        }
        
        const user = JSON.parse(userStr);
        const userId = user._id || user.id;
        
        if (!userId) {
            throw new Error('User ID not found');
        }
        
        console.log(`📡 Fetching activity for user: ${userId}`);
        
        // Try user-specific endpoint first
        const response = await fetch(`/api/user/${userId}/activity`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Activity response status:', response.status);
        
        if (!response.ok) {
            if (response.status === 404) {
                console.log('User activity endpoint not found');
                // Try the current user endpoint
                return await loadCurrentUserActivity();
            }
            throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            allActivities = data.activities || [];
            console.log(`✅ Loaded ${allActivities.length} of YOUR activities`);
            displayActivities(allActivities);
        } else {
            throw new Error(data.error || 'Failed to load your activity');
        }
        
    } catch (error) {
        console.error('❌ Error loading your activity:', error);
        showErrorState(error.message);
    }
}

// Fallback: Load current user's activity
async function loadCurrentUserActivity() {
    try {
        console.log('🔄 Trying: /api/activity/me/activities');
        
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');
        
        const response = await fetch('/api/activity/me/activities', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Fallback failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            allActivities = data.activities || [];
            console.log(`✅ Loaded ${allActivities.length} activities`);
            displayActivities(allActivities);
        } else {
            throw new Error(data.error || 'Failed to load activity');
        }
        
    } catch (fallbackError) {
        console.error('❌ Both endpoints failed:', fallbackError);
        showMockUserActivity();
    }
}

// Show mock data if API doesn't exist yet
function showMockUserActivity() {
    console.log('📝 Showing mock user activity');
    
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userName = user?.fullName || user?.email || 'You';
    
    allActivities = [
        {
            id: '1',
            type: 'login',
            title: 'Login Successful',
            description: `You logged into your account`,
            amount: 0,
            currency: 'WETH',
            user: { fullName: userName, email: user?.email },
            createdAt: new Date().toISOString()
        },
        {
            id: '2',
            type: 'nft_purchased',
            title: 'NFT Purchased',
            description: `You bought "Digital Art #123" for 0.5 WETH`,
            amount: 0.5,
            currency: 'WETH',
            user: { fullName: userName, email: user?.email },
            createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: '3',
            type: 'nft_created',
            title: 'NFT Created',
            description: `You created and listed "My Artwork #456"`,
            amount: 0,
            currency: 'WETH',
            user: { fullName: userName, email: user?.email },
            createdAt: new Date(Date.now() - 86400000).toISOString()
        }
    ];
    
    console.log(`📋 Showing ${allActivities.length} example activities`);
    displayActivities(allActivities);
}

function showErrorState(errorMessage) {
    const feed = document.getElementById('activityFeed');
    if (feed) {
        feed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Unable to Load Your Activity</h3>
                <p>${errorMessage || 'Please try again later'}</p>
                <button class="btn" onclick="loadUserActivity()" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }
}

// ============================================
// DISPLAY AND FILTER FUNCTIONS
// ============================================

// Filter activities by type
function filterActivity(type) {
    if (!type) return;
    
    currentFilter = type;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find the clicked button and mark it active
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.getAttribute('data-type') === type) {
            btn.classList.add('active');
        }
    });
    
    // Filter activities
    let filteredActivities = allActivities;
    if (type !== 'all') {
        filteredActivities = allActivities.filter(activity => activity.type === type);
    }
    
    // Display filtered activities
    displayActivities(filteredActivities);
}

// Display activities in the feed
function displayActivities(activities) {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;
    
    if (!activities || activities.length === 0) {
        feed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h3>No Activity Found</h3>
                <p>You haven't performed any ${currentFilter === 'all' ? '' : currentFilter.replace('_', ' ')} actions yet</p>
                <p style="font-size: 14px; color: #888; margin-top: 10px;">
                    Create, buy, or sell NFTs to see activity here
                </p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    activities.forEach(activity => {
        const iconInfo = getActivityIcon(activity.type);
        const timeDisplay = formatTime(activity.createdAt);
        
        // Format amount if present
        let amountHtml = '';
        if (activity.amount !== undefined && activity.amount !== null && activity.amount !== 0) {
            const amount = parseFloat(activity.amount);
            if (!isNaN(amount)) {
                const sign = amount > 0 ? '+' : '';
                const amountClass = amount > 0 ? 'positive' : 'negative';
                amountHtml = `
                    <div class="activity-amount ${amountClass}">
                        ${sign}${Math.abs(amount)} ${activity.currency || 'WETH'}
                    </div>
                `;
            }
        }
        
        // Show "You" for current user's activities
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const isCurrentUser = activity.user && 
                            (activity.user.email === currentUser.email || 
                             activity.user._id === currentUser._id);
        
        let userHtml = '';
        if (activity.user) {
            if (isCurrentUser) {
                userHtml = `
                    <div class="activity-user">
                        <i class="fas fa-user"></i>
                        <span>You</span>
                    </div>
                `;
            } else {
                userHtml = `
                    <div class="activity-user">
                        <i class="fas fa-user"></i>
                        <span>${activity.user.fullName || activity.user.email || 'User'}</span>
                    </div>
                `;
            }
        }
        
        html += `
            <div class="activity-item">
                <div class="activity-icon" style="background: ${iconInfo.color}20; color: ${iconInfo.color};">
                    <i class="${iconInfo.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title || 'Activity'}</div>
                    <div class="activity-description">${activity.description || ''}</div>
                    <div class="activity-meta">
                        ${userHtml}
                        <div class="activity-time">
                            <i class="far fa-clock"></i> ${timeDisplay}
                        </div>
                    </div>
                </div>
                ${amountHtml}
            </div>
        `;
    });
    
    feed.innerHTML = html;
}

function getActivityIcon(type) {
    const iconMap = {
        'nft_created': { icon: 'fas fa-plus-circle', color: '#9C27B0' },
        'nft_purchased': { icon: 'fas fa-shopping-cart', color: '#4CAF50' },
        'nft_sold': { icon: 'fas fa-tag', color: '#FF9800' },
        'nft_transferred': { icon: 'fas fa-exchange-alt', color: '#2196F3' },
        'funds_added': { icon: 'fas fa-wallet', color: '#00BCD4' },
        'login': { icon: 'fas fa-sign-in-alt', color: '#673AB7' },
        'profile_updated': { icon: 'fas fa-user-edit', color: '#FF5722' },
        'default': { icon: 'fas fa-history', color: '#6c63ff' }
    };
    
    return iconMap[type] || iconMap.default;
}

function formatTime(timestamp) {
    if (!timestamp) return 'Recently';
    
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        
        if (diffMs < 60000) return 'Just now';
        if (diffMs < 3600000) {
            const mins = Math.floor(diffMs / 60000);
            return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
        }
        if (diffMs < 86400000) {
            const hours = Math.floor(diffMs / 3600000);
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        }
        
        const days = Math.floor(diffMs / 86400000);
        if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString();
    } catch (e) {
        return 'Recently';
    }
}

// Setup event listeners
function setupActivityEventListeners() {
    // Filter button clicks
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            if (type) {
                filterActivity(type);
            }
        });
    });
}

// Logout function
function logoutFromActivityPage() {
    console.log('🚪 Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// ============================================
// GLOBAL EXPORTS
// ============================================

window.filterActivity = filterActivity;
window.loadUserActivity = loadUserActivity;
window.logoutFromActivityPage = logoutFromActivityPage;