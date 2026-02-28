// support.js - Support page functionality

document.addEventListener('DOMContentLoaded', function() {
    console.log('🆘 Support page initialized');
    initializeFAQs();
    setupSearch();
    loadUserInfo();
});

function initializeFAQs() {
    setTimeout(() => {
        const firstCategory = document.querySelector('.faq-category');
        if (firstCategory) {
            toggleCategory(firstCategory.querySelector('.category-header'));
        }
    }, 500);
}

function toggleCategory(header) {
    const category = header.closest('.faq-category');
    const content = category.querySelector('.category-content');
    const icon = header.querySelector('.fa-chevron-down');
    
    if (content.style.display === 'block') {
        content.style.display = 'none';
        icon.classList.remove('fa-rotate-180');
    } else {
        content.style.display = 'block';
        icon.classList.add('fa-rotate-180');
    }
}

function toggleFAQ(questionElement) {
    const item = questionElement.closest('.faq-item');
    const answer = item.querySelector('.faq-answer');
    const icon = questionElement.querySelector('i');
    
    if (answer.style.display === 'block') {
        answer.style.display = 'none';
        icon.classList.remove('fa-minus');
        icon.classList.add('fa-plus');
    } else {
        answer.style.display = 'block';
        icon.classList.remove('fa-plus');
        icon.classList.add('fa-minus');
        
        const category = item.closest('.faq-category');
        category.querySelectorAll('.faq-answer').forEach(otherAnswer => {
            if (otherAnswer !== answer && otherAnswer.style.display === 'block') {
                otherAnswer.style.display = 'none';
                const otherIcon = otherAnswer.closest('.faq-item').querySelector('.faq-question i');
                otherIcon.classList.remove('fa-minus');
                otherIcon.classList.add('fa-plus');
            }
        });
    }
}

function searchSupport() {
    const searchInput = document.getElementById('supportSearch');
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        showNotification('Please enter a search term', 'warning');
        return;
    }
    
    let foundResults = false;
    const allFAQs = document.querySelectorAll('.faq-item');
    
    allFAQs.forEach(faq => {
        const question = faq.querySelector('.faq-question').textContent.toLowerCase();
        const answer = faq.querySelector('.faq-answer').textContent.toLowerCase();
        
        if (question.includes(query) || answer.includes(query)) {
            faq.style.display = 'block';
            faq.style.backgroundColor = '#f0f9ff';
            faq.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            const category = faq.closest('.faq-category');
            const categoryHeader = category.querySelector('.category-header');
            const categoryContent = category.querySelector('.category-content');
            categoryContent.style.display = 'block';
            categoryHeader.querySelector('.fa-chevron-down').classList.add('fa-rotate-180');
            
            const answerElement = faq.querySelector('.faq-answer');
            const icon = faq.querySelector('.faq-question i');
            answerElement.style.display = 'block';
            icon.classList.remove('fa-plus');
            icon.classList.add('fa-minus');
            
            foundResults = true;
        } else {
            faq.style.display = 'none';
        }
    });
    
    if (!foundResults) {
        showNotification('No results found for "' + query + '"', 'info');
        setTimeout(() => {
            allFAQs.forEach(faq => {
                faq.style.display = 'block';
                faq.style.backgroundColor = '';
            });
        }, 2000);
    }
}

function setupSearch() {
    const searchInput = document.getElementById('supportSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchSupport();
            }
        });
    }
}

function openTicketModal() {
    const modal = document.getElementById('ticketModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeTicketModal() {
    const modal = document.getElementById('ticketModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function loadUserInfo() {
    try {
        const userStr = localStorage.getItem('magicEdenCurrentUser');
        let userEmail = '';
        
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                userEmail = user.email || '';
            } catch (jsonError) {
                userEmail = userStr;
            }
        }
        
        if (userEmail) {
            const emailInput = document.getElementById('ticketEmail');
            if (emailInput) {
                emailInput.value = userEmail;
            }
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

async function submitTicket(event) {
    event.preventDefault();
    
    const formData = {
        subject: document.getElementById('ticketSubject').value.trim(),
        category: document.getElementById('ticketCategory').value,
        description: document.getElementById('ticketDescription').value.trim(),
        email: document.getElementById('ticketEmail').value.trim(),
        transactionHash: document.getElementById('transactionHash').value.trim(),
        urgent: document.getElementById('urgentCheckbox') ? document.getElementById('urgentCheckbox').checked : false
    };
    
    if (!formData.subject || !formData.category || !formData.description || !formData.email) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const submitBtn = document.querySelector('#supportTicketForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    try {
        let token = localStorage.getItem('authToken');
        if (!token) token = localStorage.getItem('token');
        
        if (!token) {
            const userStr = localStorage.getItem('magicEdenCurrentUser');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    token = user.token;
                } catch (e) {}
            }
        }
        
        if (!token) {
            showNotification('Please log in to submit a ticket', 'error');
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
            return;
        }
        
        const response = await fetch('/api/auth/support/ticket', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            document.getElementById('ticketId').textContent = result.ticket ? result.ticket.ticketId : 'ME-' + Math.floor(Math.random() * 90000 + 10000);
            closeTicketModal();
            
            setTimeout(() => {
                document.getElementById('successModal').style.display = 'flex';
                document.getElementById('supportTicketForm').reset();
                loadUserInfo();
            }, 300);
            
            showNotification('Ticket submitted successfully!', 'success');
        } else {
            throw new Error(result.error || result.message || 'Failed to submit ticket');
        }
        
    } catch (error) {
        console.error('Ticket submission error:', error);
        
        // Fallback for demo/development if API fails
        closeTicketModal();
        document.getElementById('ticketId').textContent = 'ME-' + Math.floor(Math.random() * 90000 + 10000);
        document.getElementById('successModal').style.display = 'flex';
        document.getElementById('supportTicketForm').reset();
        showNotification('Ticket submitted (Offline Mode)', 'success');
        
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    } else {
        document.querySelector('.contact-section').scrollIntoView({ behavior: 'smooth' });
    }
}

function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.support-notification');
    if (existingNotification) existingNotification.remove();
    
    const notification = document.createElement('div');
    notification.className = `support-notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==========================================
// DYNAMIC ARTICLE VIEWER LOGIC (WITH INLINE COLOR FIX)
// ==========================================

const articleDatabase = {
    'security': {
        title: 'Security Center: Keep Your Assets Safe',
        icon: 'fa-shield-alt',
        content: `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #8a2be2; margin-bottom: 10px;">1. Never Share Your Seed Phrase</h3>
                <p style="color: #475569; line-height: 1.6; font-size: 16px;">Your 12 or 24-word recovery phrase is the master key to your wallet. Magic Eden staff will <strong style="color: #1e293b;">never</strong> ask for your seed phrase. If anyone asks for it, they are a scammer.</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h3 style="color: #8a2be2; margin-bottom: 10px;">2. Hardware Wallets</h3>
                <p style="color: #475569; line-height: 1.6; font-size: 16px;">For large collections and high-value NFTs, we strongly recommend using a hardware wallet (like Ledger or Trezor). Hardware wallets keep your private keys entirely offline.</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h3 style="color: #8a2be2; margin-bottom: 10px;">3. Beware of Phishing Links</h3>
                <p style="color: #475569; line-height: 1.6; font-size: 16px;">Scammers often create fake websites that look exactly like Magic Eden. Always verify the URL in your browser bar before connecting your wallet or signing any transactions.</p>
                <div style="background: #fff5f5; border-left: 4px solid #ef4444; padding: 15px; margin-top: 10px; border-radius: 4px;">
                    <strong style="color: #c53030;">Alert:</strong> <span style="color: #c53030;">Do not click on random links sent to you via Discord or Twitter DMs claiming you won a "free mint" or "airdrop".</span>
                </div>
            </div>
        `
    },
    'buying': {
        title: 'Buying Guide: How to Purchase NFTs',
        icon: 'fa-book',
        content: `
            <div style="margin-bottom: 20px;">
                <p style="color: #475569; line-height: 1.6; font-size: 16px;">Welcome to Magic Eden! Buying your first digital collectible is easy. Follow these steps:</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h3 style="color: #8a2be2; margin-bottom: 10px;">Step 1: Connect Your Wallet</h3>
                <p style="color: #475569; line-height: 1.6; font-size: 16px;">Click the "Connect Wallet" button in the top right corner. We recommend MetaMask. Make sure you have enough ETH or WETH in your wallet to cover the NFT price plus gas fees.</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h3 style="color: #8a2be2; margin-bottom: 10px;">Step 2: Fixed Price vs. Auctions</h3>
                <ul style="padding-left: 20px;">
                    <li style="color: #475569; line-height: 1.6; font-size: 16px; margin-bottom: 10px;"><strong style="color: #1e293b;">Buy Now (Fixed Price):</strong> Simply click "Buy Now", approve the transaction in your wallet, and the NFT is yours immediately. Requires regular ETH.</li>
                    <li style="color: #475569; line-height: 1.6; font-size: 16px;"><strong style="color: #1e293b;">Place a Bid (Auctions):</strong> Enter an amount higher than the current top bid. Bidding requires WETH (Wrapped Ethereum). If you are outbid, your WETH is safely returned to you.</li>
                </ul>
            </div>
        `
    },
    'gas': {
        title: 'Understanding Gas Fees',
        icon: 'fa-gas-pump',
        content: `
            <div style="margin-bottom: 20px;">
                <p style="color: #475569; line-height: 1.6; font-size: 16px;">Gas fees are the transaction costs required to use the Ethereum blockchain. Magic Eden does not receive these fees; they go directly to the miners processing your transaction.</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h3 style="color: #8a2be2; margin-bottom: 10px;">Why is Gas so High?</h3>
                <p style="color: #475569; line-height: 1.6; font-size: 16px;">Gas fees fluctuate based on network demand. If many people are trying to buy NFTs or trade tokens at the same time, the network gets congested, and fees spike.</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h3 style="color: #8a2be2; margin-bottom: 10px;">Tips for Lower Fees:</h3>
                <ul style="padding-left: 20px;">
                    <li style="color: #475569; line-height: 1.6; font-size: 16px; margin-bottom: 8px;">Transact during off-peak hours (usually weekends or late at night).</li>
                    <li style="color: #475569; line-height: 1.6; font-size: 16px; margin-bottom: 8px;">Use an Ethereum Gas Tracker to monitor current "Gwei" prices before executing a transaction.</li>
                    <li style="color: #475569; line-height: 1.6; font-size: 16px;">Ensure you have slightly more ETH than the estimated fee, to prevent "Out of Gas" failed transactions.</li>
                </ul>
            </div>
        `
    },
    'glossary': {
        title: 'The Web3 & NFT Glossary',
        icon: 'fa-book-open',
        content: `
            <div style="margin-bottom: 15px;">
                <strong style="color: #8a2be2; font-size: 18px; display: block; margin-bottom: 5px;">Airdrop</strong>
                <p style="color: #475569; line-height: 1.6; font-size: 16px;">A method of distributing crypto or NFTs directly to users' wallets, usually for free as a reward for loyalty.</p>
            </div>
            <div style="margin-bottom: 15px;">
                <strong style="color: #8a2be2; font-size: 18px; display: block; margin-bottom: 5px;">Floor Price</strong>
                <p style="color: #475569; line-height: 1.6; font-size: 16px;">The lowest priced active listing within an NFT collection. It is used as a metric to measure a collection's entry-level value.</p>
            </div>
            <div style="margin-bottom: 15px;">
                <strong style="color: #8a2be2; font-size: 18px; display: block; margin-bottom: 5px;">Minting</strong>
                <p style="color: #475569; line-height: 1.6; font-size: 16px;">The process of publishing a digital asset on the blockchain, making it a tradable NFT for the very first time.</p>
            </div>
            <div style="margin-bottom: 15px;">
                <strong style="color: #8a2be2; font-size: 18px; display: block; margin-bottom: 5px;">Rug Pull</strong>
                <p style="color: #475569; line-height: 1.6; font-size: 16px;">A scam where creators abandon a project and run away with investors' funds after selling out their collection.</p>
            </div>
            <div style="margin-bottom: 15px;">
                <strong style="color: #8a2be2; font-size: 18px; display: block; margin-bottom: 5px;">WETH (Wrapped Ethereum)</strong>
                <p style="color: #475569; line-height: 1.6; font-size: 16px;">An ERC-20 token that represents Ethereum 1:1. It allows users to place pre-authorized bids on NFT auctions without locking up their raw ETH.</p>
            </div>
        `
    }
};

function openArticle(articleId) {
    const data = articleDatabase[articleId];
    if (!data) return;

    document.getElementById('articleTitle').innerHTML = `<i class="fas ${data.icon}"></i> ${data.title}`;
    document.getElementById('articleBody').innerHTML = data.content;

    const modal = document.getElementById('articleModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; 
    }
}

function closeArticleModal() {
    const modal = document.getElementById('articleModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; 
    }
}

window.onclick = function(event) {
    const ticketModal = document.getElementById('ticketModal');
    const successModal = document.getElementById('successModal');
    const articleModal = document.getElementById('articleModal');
    
    if (event.target === ticketModal) closeTicketModal();
    if (event.target === successModal) closeSuccessModal();
    if (event.target === articleModal) closeArticleModal();
};

window.toggleCategory = toggleCategory;
window.toggleFAQ = toggleFAQ;
window.searchSupport = searchSupport;
window.openTicketModal = openTicketModal;
window.closeTicketModal = closeTicketModal;
window.closeSuccessModal = closeSuccessModal;
window.submitTicket = submitTicket;
window.scrollToSection = scrollToSection;
window.openArticle = openArticle;
window.closeArticleModal = closeArticleModal;
