// ============================================
// ADMIN PANEL JAVASCRIPT (PRODUCTION VERSION)
// ============================================

// Check if user is admin
function checkAdminAccess() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
        window.location.href = '/login';
        return false;
    }
    
    try {
        const user = JSON.parse(userStr);
        if (!user.isAdmin) {
            alert('Admin access required');
            window.location.href = '/dashboard';
            return false;
        }
        return true;
    } catch (error) {
        window.location.href = '/login';
        return false;
    }
}

// Tab switching
function showAdminTab(tab, event) {
    // Update tabs
    const tabs = document.querySelectorAll('.admin-tab');
    const contents = document.querySelectorAll('.admin-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    // Show selected tab
    const tabElement = document.getElementById(tab + 'Tab');
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Load tab data from backend
    if (tab === 'dashboard') {
        loadDashboard();
    } else if (tab === 'nfts') {
        loadNFTsTable();
    } else if (tab === 'users') {
        loadUsersTable();
    } else if (tab === 'support') {
        loadTicketsTable();
    }
}

// ========================
// DASHBOARD & STATS
// ========================
async function loadDashboard() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch dashboard stats');
        const data = await response.json();
        
        if (data.success) {
            // Update stats
            document.getElementById('adminTotalNFTs').textContent = data.stats.totalNFTs || 0;
            document.getElementById('adminTotalUsers').textContent = data.stats.totalUsers || 0;
            document.getElementById('adminTotalVolume').textContent = (data.stats.totalVolume || 0) + ' WETH';
            document.getElementById('adminOpenTickets').textContent = data.stats.openTickets || 0;
            document.getElementById('adminFeaturedNFTs').textContent = data.stats.featuredNFTs || 0;
            document.getElementById('adminBoostedNFTs').textContent = data.stats.boostedNFTs || 0;
            
            // Load recent activity
            const activity = document.getElementById('recentActivity');
            if (activity) {
                if (!data.recentActivity || data.recentActivity.length === 0) {
                    activity.innerHTML = '<div class="no-results">No recent activity</div>';
                } else {
                    activity.innerHTML = data.recentActivity.map(nft => `
                        <div class="stat-box" style="margin-bottom: 10px;">
                            <strong>${nft.name}</strong>
                            <div>${nft.collectionName || 'No Collection'} • ${nft.price} WETH</div>
                            <small>Created: ${new Date(nft.createdAt).toLocaleDateString()}</small>
                        </div>
                    `).join('');
                }
            }
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ========================
// NFT MANAGEMENT
// ========================
async function loadNFTsTable() {
    const tbody = document.getElementById('nftsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading NFTs...</td></tr>';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/nfts', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success && data.nfts.length > 0) {
            tbody.innerHTML = data.nfts.map(nft => {
                const totalViews = (nft.views || 0) + (nft.boostedViews || 0);
                const totalLikes = (nft.likes || 0) + (nft.boostedLikes || 0);
                
                return `
                    <tr>
                        <td style="font-family: monospace; font-size: 12px;">${nft.tokenId ? nft.tokenId.substring(0, 8) + '...' : 'N/A'}</td>
                        <td>
                            <strong>${nft.name}</strong>
                            ${nft.isFeatured ? '<br><small style="color: #f59e0b;"><i class="fas fa-star"></i> Featured</small>' : ''}
                        </td>
                        <td>${nft.collectionName || 'None'}</td>
                        <td><strong>${nft.price} WETH</strong></td>
                        <td>
                            <div style="font-size: 12px;">
                                <div><i class="fas fa-eye"></i> ${totalViews} views</div>
                                <div><i class="fas fa-heart"></i> ${totalLikes} likes</div>
                            </div>
                        </td>
                        <td>
                            ${nft.isFeatured ? '<span style="color: #f59e0b;"><i class="fas fa-star"></i> Featured</span>' :
                              nft.isPromoted ? '<span style="color: #8a2be2;"><i class="fas fa-rocket"></i> Promoted</span>' :
                              '<span style="color: #888;"><i class="fas fa-circle"></i> Normal</span>'}
                        </td>
                        <td>
                            <div class="nft-actions" style="display:flex; gap:5px;">
                                <button class="action-btn btn-boost" onclick="showBoostModal('${nft._id}', '${nft.name.replace(/'/g, "\\'")}')" title="Boost NFT">
                                    <i class="fas fa-rocket"></i>
                                </button>
                                <button class="action-btn btn-feature" onclick="toggleFeatureNFT('${nft._id}', ${nft.isFeatured || false})" title="Feature NFT">
                                    <i class="fas fa-star"></i>
                                </button>
                                <button class="action-btn btn-delete" onclick="deleteNFT('${nft._id}')" title="Delete NFT">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="no-results">No NFTs found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading NFTs:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="error-message">Failed to load NFTs</td></tr>';
    }
}

// 🚀 FIXED: BOOST NFT FUNCTIONALITY
function showBoostModal(nftId, nftName) {
    const amount = prompt(`Enter amount to boost for "${nftName}":`, "100");
    if (!amount || isNaN(amount)) return;
    
    const type = prompt("Boost 'views' or 'likes'?", "likes");
    if (type && (type === 'views' || type === 'likes')) {
        boostNFT(nftId, type, parseInt(amount));
    } else {
        alert('Invalid type. Must type "views" or "likes"');
    }
}

async function boostNFT(nftId, type, amount) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/nfts/${nftId}/boost`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type, amount })
        });
        
        const data = await response.json();
        if (data.success) {
            alert(`✅ Successfully boosted ${amount} ${type}!`);
            loadNFTsTable(); // Refresh table to show new numbers
            loadDashboard();
        } else {
            alert(`❌ Error: ${data.error}`);
        }
    } catch (error) {
        console.error('Boost error:', error);
        alert('Failed to connect to server.');
    }
}

async function toggleFeatureNFT(nftId, currentlyFeatured) {
    if (!confirm(`Are you sure you want to ${currentlyFeatured ? 'unfeature' : 'feature'} this NFT?`)) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/nfts/${nftId}/feature`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ featured: !currentlyFeatured })
        });
        
        const data = await response.json();
        if (data.success) {
            loadNFTsTable();
            loadDashboard();
        }
    } catch (error) {
        console.error('Feature error:', error);
    }
}

async function deleteNFT(nftId) {
    if (!confirm('Are you sure you want to permanently delete this NFT?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/nfts/${nftId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (data.success) {
            loadNFTsTable();
            loadDashboard();
        }
    } catch (error) {
        console.error('Delete error:', error);
    }
}

// ========================
// USER MANAGEMENT
// ========================
async function loadUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading users...</td></tr>';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success && data.users.length > 0) {
            tbody.innerHTML = data.users.map(user => `
                <tr>
                    <td><strong>${user.email}</strong></td>
                    <td>${user.internalBalance || 0} ETH</td>
                    <td>${user.wethBalance || 0} WETH</td>
                    <td style="font-family: monospace; font-size: 12px;">${user.depositAddress || 'No wallet'}</td>
                    <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>${user.isAdmin ? '<span style="color: #10b981;">Admin</span>' : '<span style="color: #888;">User</span>'}</td>
                    <td>
                        <button class="action-btn btn-edit" onclick="editUserBalance('${user._id}', '${user.email}', ${user.internalBalance || 0}, ${user.wethBalance || 0})">
                            <i class="fas fa-edit"></i> Edit Balance
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="no-results">No users found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="error-message">Failed to load users</td></tr>';
    }
}

function editUserBalance(userId, email, currentEth, currentWeth) {
    const newEth = prompt(`Enter new ETH Balance for ${email}:`, currentEth);
    if (newEth === null) return;
    
    const newWeth = prompt(`Enter new WETH Balance for ${email}:`, currentWeth);
    if (newWeth === null) return;
    
    saveUserBalance(userId, email, parseFloat(newEth), parseFloat(newWeth));
}

async function saveUserBalance(userId, email, newEthBalance, newWethBalance) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}/balance`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                internalBalance: newEthBalance,
                wethBalance: newWethBalance 
            })
        });
        
        const result = await response.json();
        if (result.success) {
            alert(`✅ Balances updated for ${email}`);
            loadUsersTable();
        } else {
            alert(`❌ Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Save error:', error);
    }
}

// ========================
// TICKETS
// ========================
async function loadTicketsTable() {
    const tbody = document.getElementById('ticketsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading tickets...</td></tr>';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/tickets', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success && data.tickets.length > 0) {
            tbody.innerHTML = data.tickets.map(ticket => `
                <tr>
                    <td style="font-family: monospace; font-size: 12px;">${ticket._id.substring(0, 8)}...</td>
                    <td>${ticket.userEmail || (ticket.user ? ticket.user.email : 'Anonymous')}</td>
                    <td>${ticket.message.substring(0, 50)}...</td>
                    <td><span style="color: ${ticket.status === 'open' ? '#ef4444' : '#10b981'}">${ticket.status}</span></td>
                    <td>${new Date(ticket.createdAt).toLocaleDateString()}</td>
                    <td>
                        ${ticket.status === 'open' ? `
                            <button class="action-btn btn-resolve" onclick="resolveTicket('${ticket._id}')">
                                <i class="fas fa-check"></i> Resolve
                            </button>
                        ` : 'Resolved'}
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="no-results">No tickets found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="error-message">Failed to load tickets</td></tr>';
    }
}

async function resolveTicket(ticketId) {
    if (!confirm('Mark this ticket as resolved?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/tickets/${ticketId}/resolve`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (data.success) {
            loadTicketsTable();
            loadDashboard();
        }
    } catch (error) {
        console.error('Resolve error:', error);
    }
}

// Logout function
function adminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = '/';
    }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    if (checkAdminAccess()) {
        loadDashboard();
        
        // Setup Tab Listeners
        const tabButtons = document.querySelectorAll('.admin-tab');
        tabButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                const tab = this.getAttribute('data-tab');
                if (tab) showAdminTab(tab, event);
            });
        });
    }
});

// Make functions globally available
window.showAdminTab = showAdminTab;
window.deleteNFT = deleteNFT;
window.showBoostModal = showBoostModal;
window.boostNFT = boostNFT;
window.toggleFeatureNFT = toggleFeatureNFT;
window.editUserBalance = editUserBalance;
window.resolveTicket = resolveTicket;
window.adminLogout = adminLogout;
