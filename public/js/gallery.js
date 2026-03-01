// ============================================
// PUBLIC GALLERY LOGIC
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    const appDiv = document.getElementById('app');

    // 1. Check for ID in link
    if (!userId) {
        appDiv.innerHTML = `
            <div class="empty-state" style="margin-top: 100px;">
                <i class="fas fa-link" style="color: #ef4444;"></i>
                <h2>Invalid Link</h2>
                <p>This gallery link is broken or missing a user ID.</p>
                <a href="/" class="btn" style="margin-top: 20px;">Return Home</a>
            </div>`;
        return;
    }

    try {
        // 2. Fetch data from the public route 
        const response = await fetch(`/api/nft/public-collection/${userId}`);
        const data = await response.json();

        if (data.success) {
            renderPublicGallery(data.user, data.nfts, appDiv);
        } else {
            appDiv.innerHTML = `
                <div class="empty-state" style="margin-top: 100px;">
                    <i class="fas fa-user-slash" style="color: #ef4444;"></i>
                    <h2>Gallery Not Found</h2>
                    <p>The user you are looking for does not exist.</p>
                </div>`;
        }
    } catch (error) {
        console.error('Error loading gallery:', error);
        appDiv.innerHTML = `
            <div class="empty-state" style="margin-top: 100px;">
                <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                <h2>Server Error</h2>
                <p>Could not connect to the marketplace database.</p>
            </div>`;
    }
});

function renderPublicGallery(user, nfts, container) {
    const joinedDate = new Date(user.joined).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const totalVolume = nfts.reduce((sum, nft) => sum + (nft.price || 0), 0).toFixed(2);
    
    // Avatar Logic
    let avatarHtml = `<i class="fas fa-user"></i>`;
    if (user.profileImage) {
        avatarHtml = `<img src="${user.profileImage}" alt="${user.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    }

    // Build Header HTML
    let html = `
        <div class="gallery-hero">
            <div class="gallery-avatar">${avatarHtml}</div>
            <h1 class="gallery-name">${user.name}</h1>
            <p class="gallery-bio">${user.bio || 'NFT Collector & Creator on Magic Eden'}</p>
            
            <div class="stat-bar">
                <div class="stat-item">
                    <span class="stat-value">${nfts.length}</span>
                    <span class="stat-label">Digital Assets</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value"><i class="fab fa-ethereum" style="font-size: 18px; color: #888;"></i> ${totalVolume}</span>
                    <span class="stat-label">Total Value</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" style="font-size: 18px; padding-top: 4px;">${joinedDate}</span>
                    <span class="stat-label">Joined</span>
                </div>
            </div>
        </div>

        <div class="gallery-container">
            <div class="grid-header">
                <h2>Showcase</h2>
            </div>
            <div class="nft-grid">
    `;

    // Map the NFTs
    if (nfts.length === 0) {
        html += `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h2>Empty Gallery</h2>
                <p>This user hasn't collected or minted any NFTs yet.</p>
            </div>
        `;
    } else {
        nfts.forEach(nft => {
            const saleBadge = nft.isListed ? `<div class="on-sale-badge">ON SALE</div>` : '';
            
            // Allow users to click the card to view the NFT detail page
            html += `
                <div class="nft-card" onclick="window.location.href='/nft/${nft._id}'">
                    ${saleBadge}
                    <img src="${nft.image}" alt="${nft.name}" class="nft-image" onerror="this.src='https://via.placeholder.com/400x400/1a1a1a/444444?text=NFT'">
                    <div class="nft-info">
                        <div class="nft-collection">${nft.collectionName || 'Unknown Collection'}</div>
                        <div class="nft-name">${nft.name}</div>
                        <div class="nft-price-row">
                            <span class="price-label">Price</span>
                            <span class="price-value"><i class="fab fa-ethereum" style="color: #aaa; font-size: 12px;"></i> ${nft.price}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `</div></div>`;
    container.innerHTML = html;
}
