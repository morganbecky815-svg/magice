// Admin Panel JavaScript

// Check if user is admin
function checkAdminAccess() {
    const userEmail = localStorage.getItem('magicEdenCurrentUser');
    if (!userEmail) {
        window.location.href = '/login';
        return false;
    }
    
    const users = JSON.parse(localStorage.getItem('magicEdenUsers')) || [];
    const user = users.find(u => u.email === userEmail);
    
    if (!user) {
        window.location.href = '/login';
        return false;
    }
    
    if (!user.isAdmin) {
        alert('Admin access required');
        window.location.href = '/';
        return false;
    }
    
    return true;
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
    
    // Load tab data
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

// Load dashboard
function loadDashboard() {
    const nfts = JSON.parse(localStorage.getItem('magicEdenNFTs')) || [];
    const users = JSON.parse(localStorage.getItem('magicEdenUsers')) || [];
    const tickets = JSON.parse(localStorage.getItem('magicEdenSupportTickets')) || [];
    
    // Update stats
    const totalNFTs = document.getElementById('adminTotalNFTs');
    const totalUsers = document.getElementById('adminTotalUsers');
    const totalVolume = document.getElementById('adminTotalVolume');
    const openTickets = document.getElementById('adminOpenTickets');
    
    if (totalNFTs) totalNFTs.textContent = nfts.length;
    if (totalUsers) totalUsers.textContent = users.length;
    
    // Calculate total volume
    let volume = 0;
    nfts.forEach(nft => {
        volume += nft.price;
    });
    if (totalVolume) totalVolume.textContent = volume.toFixed(2) + ' WETH';
    
    // Count open tickets
    const openCount = tickets.filter(t => t.status === 'open').length;
    if (openTickets) openTickets.textContent = openCount;
    
    // Load recent activity
    const activity = document.getElementById('recentActivity');
    if (activity) {
        activity.innerHTML = '';
        
        // Show recent NFTs
        const recentNFTs = nfts.slice(-5).reverse();
        recentNFTs.forEach(nft => {
            const item = document.createElement('div');
            item.className = 'stat-box';
            item.innerHTML = '<strong>' + nft.name + '</strong>' +
                '<div>' + nft.collection + ' • ' + nft.price + ' WETH</div>' +
                '<small>Created: ' + new Date(nft.createdAt).toLocaleDateString() + '</small>';
            activity.appendChild(item);
        });
    }
}

// Load NFTs table
function loadNFTsTable() {
    const nfts = JSON.parse(localStorage.getItem('magicEdenNFTs')) || [];
    const tbody = document.getElementById('nftsTableBody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    nfts.forEach(nft => {
        const row = document.createElement('tr');
        row.innerHTML = '<td>' + nft.id + '</td>' +
            '<td>' + nft.name + '</td>' +
            '<td>' + nft.collection + '</td>' +
            '<td>' + nft.price + ' WETH</td>' +
            '<td>' + nft.owner + '</td>' +
            '<td>' +
            '<button class="action-btn btn-edit" onclick="editNFT(' + nft.id + ')">' +
            '<i class="fas fa-edit"></i> Edit</button> ' +
            '<button class="action-btn btn-delete" onclick="deleteNFT(' + nft.id + ')">' +
            '<i class="fas fa-trash"></i> Delete</button>' +
            '</td>';
        tbody.appendChild(row);
    });
}

// Load users table
function loadUsersTable() {
    const users = JSON.parse(localStorage.getItem('magicEdenUsers')) || [];
    const tbody = document.getElementById('usersTableBody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = '<td>' + user.email + '</td>' +
            '<td>' + user.balance + ' WETH</td>' +
            '<td>' + new Date(user.createdAt).toLocaleDateString() + '</td>' +
            '<td>' + (user.isAdmin ? 'Yes' : 'No') + '</td>' +
            '<td>' +
            '<button class="action-btn btn-edit" onclick="editUser(\'' + user.email + '\')">' +
            '<i class="fas fa-edit"></i> Edit</button>' +
            '</td>';
        tbody.appendChild(row);
    });
}

// Load tickets table
function loadTicketsTable() {
    const tickets = JSON.parse(localStorage.getItem('magicEdenSupportTickets')) || [];
    const tbody = document.getElementById('ticketsTableBody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    tickets.forEach(ticket => {
        const row = document.createElement('tr');
        row.innerHTML = '<td>' + ticket.id + '</td>' +
            '<td>' + ticket.userEmail + '</td>' +
            '<td>' + ticket.message.substring(0, 50) + (ticket.message.length > 50 ? '...' : '') + '</td>' +
            '<td><span style="color: ' + (ticket.status === 'open' ? '#ef4444' : '#10b981') + '">' + 
            ticket.status + '</span></td>' +
            '<td>' + new Date(ticket.createdAt).toLocaleDateString() + '</td>' +
            '<td>' + 
            (ticket.status === 'open' ? 
                '<button class="action-btn btn-resolve" onclick="resolveTicket(' + ticket.id + ')">' +
                '<i class="fas fa-check"></i> Resolve</button>' : '') +
            '</td>';
        tbody.appendChild(row);
    });
}

// Admin create NFT
function adminCreateNFT(event) {
    event.preventDefault();
    
    const name = document.getElementById('adminNftName').value;
    const collection = document.getElementById('adminNftCollection').value;
    const price = parseFloat(document.getElementById('adminNftPrice').value);
    const category = document.getElementById('adminNftCategory').value;
    const image = document.getElementById('adminNftImage').value;
    const owner = document.getElementById('adminNftOwner').value;
    
    const messageEl = document.getElementById('adminMessage');
    
    // Validation
    if (!name || !collection || !price || !category || !image || !owner) {
        if (messageEl) {
            messageEl.textContent = 'Please fill all fields!';
            messageEl.className = 'admin-message error';
        }
        return false;
    }
    
    // Get NFTs from localStorage
    const nfts = JSON.parse(localStorage.getItem('magicEdenNFTs')) || [];
    const newNFT = {
        id: Date.now(),
        name: name,
        collection: collection,
        price: price,
        category: category,
        image: image,
        owner: owner,
        createdAt: new Date().toISOString(),
        tokenId: 'ME' + Date.now().toString(36).toUpperCase()
    };
    
    nfts.push(newNFT);
    localStorage.setItem('magicEdenNFTs', JSON.stringify(nfts));
    
    if (messageEl) {
        messageEl.textContent = 'NFT created successfully!';
        messageEl.className = 'admin-message success';
    }
    
    // Clear form
    document.getElementById('adminCreateForm').reset();
    
    // Refresh tables
    loadNFTsTable();
    loadDashboard();
    
    return false;
}

// Admin functions
function deleteNFT(id) {
    if (confirm('Are you sure you want to delete this NFT?')) {
        let nfts = JSON.parse(localStorage.getItem('magicEdenNFTs')) || [];
        nfts = nfts.filter(nft => nft.id !== id);
        localStorage.setItem('magicEdenNFTs', JSON.stringify(nfts));
        loadNFTsTable();
        loadDashboard();
    }
}

function editNFT(id) {
    alert('Edit feature coming soon! NFT ID: ' + id);
}

function editUser(email) {
    const newBalance = prompt('Enter new balance for ' + email + ':', '10');
    if (newBalance !== null) {
        const users = JSON.parse(localStorage.getItem('magicEdenUsers')) || [];
        const userIndex = users.findIndex(u => u.email === email);
        
        if (userIndex !== -1) {
            users[userIndex].balance = parseFloat(newBalance);
            localStorage.setItem('magicEdenUsers', JSON.stringify(users));
            loadUsersTable();
            alert('Balance updated!');
        }
    }
}

function resolveTicket(id) {
    let tickets = JSON.parse(localStorage.getItem('magicEdenSupportTickets')) || [];
    const ticketIndex = tickets.findIndex(t => t.id === id);
    
    if (ticketIndex !== -1) {
        tickets[ticketIndex].status = 'resolved';
        localStorage.setItem('magicEdenSupportTickets', JSON.stringify(tickets));
        loadTicketsTable();
        loadDashboard();
        alert('Ticket resolved!');
    }
}

// Boost NFT views/likes
router.post('/nfts/:id/boost', adminAuth, async (req, res) => {
    try {
        const { type, amount } = req.body;
        const nft = await NFT.findById(req.params.id);
        
        if (!nft) {
            return res.status(404).json({ error: 'NFT not found' });
        }
        
        if (type === 'views') {
            nft.boostedViews = (nft.boostedViews || 0) + parseInt(amount);
            nft.isPromoted = true;
        } else if (type === 'likes') {
            nft.boostedLikes = (nft.boostedLikes || 0) + parseInt(amount);
            nft.isPromoted = true;
        } else {
            return res.status(400).json({ error: 'Invalid boost type' });
        }
        
        await nft.save();
        
        res.json({
            success: true,
            message: `Boosted ${type} by ${amount}`,
            nft
        });
        
    } catch (error) {
        console.error('Boost NFT error:', error);
        res.status(500).json({ error: 'Failed to boost NFT' });
    }
});

// Feature/unfeature NFT
router.post('/nfts/:id/feature', adminAuth, async (req, res) => {
    try {
        const { featured } = req.body;
        const nft = await NFT.findById(req.params.id);
        
        if (!nft) {
            return res.status(404).json({ error: 'NFT not found' });
        }
        
        nft.isFeatured = featured;
        await nft.save();
        
        res.json({
            success: true,
            message: `NFT ${featured ? 'featured' : 'unfeatured'} successfully`,
            nft
        });
        
    } catch (error) {
        console.error('Feature NFT error:', error);
        res.status(500).json({ error: 'Failed to feature NFT' });
    }
});

// Logout function
function adminLogout() {
    localStorage.removeItem('magicEdenCurrentUser');
    window.location.href = '/';
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    if (checkAdminAccess()) {
        loadDashboard();
        loadNFTsTable();
        loadUsersTable();
        loadTicketsTable();
    }
});



// Make functions globally available
window.showAdminTab = showAdminTab;
window.adminCreateNFT = adminCreateNFT;
window.deleteNFT = deleteNFT;
window.editNFT = editNFT;
window.editUser = editUser;
window.resolveTicket = resolveTicket;
window.adminLogout = adminLogout;