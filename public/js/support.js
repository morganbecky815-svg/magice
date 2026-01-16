// support.js - Support page functionality

document.addEventListener('DOMContentLoaded', function() {
    console.log('🆘 Support page initialized');
    
    // Initialize FAQ functionality
    initializeFAQs();
    
    // Set up search functionality
    setupSearch();
    
    // Load user info for ticket form
    loadUserInfo();
});

// Initialize FAQ functionality
function initializeFAQs() {
    // Open first category by default
    setTimeout(() => {
        const firstCategory = document.querySelector('.faq-category');
        if (firstCategory) {
            toggleCategory(firstCategory.querySelector('.category-header'));
        }
    }, 500);
}

// Toggle FAQ category
function toggleCategory(header) {
    const category = header.closest('.faq-category');
    const content = category.querySelector('.category-content');
    const icon = header.querySelector('.fa-chevron-down');
    
    // Toggle content visibility
    if (content.style.display === 'block') {
        content.style.display = 'none';
        icon.classList.remove('fa-rotate-180');
    } else {
        content.style.display = 'block';
        icon.classList.add('fa-rotate-180');
    }
}

// Toggle FAQ item
function toggleFAQ(questionElement) {
    const item = questionElement.closest('.faq-item');
    const answer = item.querySelector('.faq-answer');
    const icon = questionElement.querySelector('i');
    
    // Toggle answer visibility
    if (answer.style.display === 'block') {
        answer.style.display = 'none';
        icon.classList.remove('fa-minus');
        icon.classList.add('fa-plus');
    } else {
        answer.style.display = 'block';
        icon.classList.remove('fa-plus');
        icon.classList.add('fa-minus');
        
        // Close other open FAQs in same category
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

// Search support articles
function searchSupport() {
    const searchInput = document.getElementById('supportSearch');
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        showNotification('Please enter a search term', 'warning');
        return;
    }
    
    // Search through all FAQs
    let foundResults = false;
    const allFAQs = document.querySelectorAll('.faq-item');
    
    allFAQs.forEach(faq => {
        const question = faq.querySelector('.faq-question').textContent.toLowerCase();
        const answer = faq.querySelector('.faq-answer').textContent.toLowerCase();
        
        if (question.includes(query) || answer.includes(query)) {
            // Show and highlight this FAQ
            faq.style.display = 'block';
            faq.style.backgroundColor = '#f0f9ff';
            faq.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Open the category
            const category = faq.closest('.faq-category');
            const categoryHeader = category.querySelector('.category-header');
            const categoryContent = category.querySelector('.category-content');
            categoryContent.style.display = 'block';
            categoryHeader.querySelector('.fa-chevron-down').classList.add('fa-rotate-180');
            
            // Open the FAQ
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
        // Reset display
        setTimeout(() => {
            allFAQs.forEach(faq => {
                faq.style.display = 'block';
                faq.style.backgroundColor = '';
            });
        }, 2000);
    }
}

// Setup search input
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

// Open ticket modal
function openTicketModal() {
    const modal = document.getElementById('ticketModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// Close ticket modal
function closeTicketModal() {
    const modal = document.getElementById('ticketModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Close success modal
function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Load user info for ticket form
function loadUserInfo() {
    const user = JSON.parse(localStorage.getItem('magicEdenCurrentUser') || '{}');
    if (user.email) {
        const emailInput = document.getElementById('ticketEmail');
        if (emailInput) {
            emailInput.value = user.email;
        }
    }
}

// Submit support ticket
function submitTicket(event) {
    event.preventDefault();
    
    // Get form data
    const subject = document.getElementById('ticketSubject').value;
    const category = document.getElementById('ticketCategory').value;
    const description = document.getElementById('ticketDescription').value;
    const email = document.getElementById('ticketEmail').value;
    const transactionHash = document.getElementById('transactionHash').value;
    const urgent = document.getElementById('urgentCheckbox').checked;
    
    // Generate ticket ID
    const ticketId = 'ME-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    // Simulate submission (in real app, this would go to backend)
    console.log('Submitting support ticket:', {
        ticketId,
        subject,
        category,
        description,
        email,
        transactionHash,
        urgent
    });
    
    // Show success modal
    document.getElementById('ticketId').textContent = ticketId;
    closeTicketModal();
    
    setTimeout(() => {
        document.getElementById('successModal').style.display = 'flex';
        // Reset form
        document.getElementById('supportTicketForm').reset();
    }, 300);
    
    // Simulate sending email
    simulateTicketConfirmation(email, ticketId);
}

// Simulate ticket confirmation email
function simulateTicketConfirmation(email, ticketId) {
    console.log('📧 Ticket confirmation sent to:', email);
    console.log('Ticket ID:', ticketId);
    
    // In a real app, you would:
    // 1. Send email to user with ticket details
    // 2. Save ticket to database
    // 3. Notify support team
    // 4. Update ticket status
}

// Scroll to section
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    } else {
        // Scroll to contact section if specific section not found
        document.querySelector('.contact-section').scrollIntoView({ behavior: 'smooth' });
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.support-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `support-notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const ticketModal = document.getElementById('ticketModal');
    const successModal = document.getElementById('successModal');
    
    if (event.target === ticketModal) {
        closeTicketModal();
    }
    if (event.target === successModal) {
        closeSuccessModal();
    }
};

// Make functions globally available
window.toggleCategory = toggleCategory;
window.toggleFAQ = toggleFAQ;
window.searchSupport = searchSupport;
window.openTicketModal = openTicketModal;
window.closeTicketModal = closeTicketModal;
window.closeSuccessModal = closeSuccessModal;
window.submitTicket = submitTicket;
window.scrollToSection = scrollToSection;