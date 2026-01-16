// about.js - About page functionality

document.addEventListener('DOMContentLoaded', function() {
    console.log('ℹ️ About page initialized');
    
    // Animate stats counters
    animateStats();
    
    // Add animation to team members
    animateTeamMembers();
    
    // Setup smooth scrolling for internal links
    setupSmoothScrolling();
});

// Animate statistics counters
function animateStats() {
    const stats = [
        { element: 'totalUsers', target: 500000, suffix: '+' },
        { element: 'totalNFTs', target: 2500000, suffix: '+' },
        { element: 'totalVolume', target: 850, suffix: 'M+' },
        { element: 'totalCollections', target: 15000, suffix: '+' }
    ];
    
    stats.forEach(stat => {
        const element = document.getElementById(stat.element);
        if (!element) return;
        
        // Start animation after delay
        setTimeout(() => {
            animateCounter(element, stat.target, stat.suffix);
        }, 500);
    });
}

// Animate counter from 0 to target
function animateCounter(element, target, suffix) {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    let step = 0;
    
    const timer = setInterval(() => {
        step++;
        current += increment;
        
        if (step >= steps) {
            current = target;
            clearInterval(timer);
        }
        
        // Format number
        let displayValue;
        if (target >= 1000000) {
            displayValue = (current / 1000000).toFixed(1) + 'M';
        } else if (target >= 1000) {
            displayValue = Math.floor(current / 1000) + 'K';
        } else {
            displayValue = Math.floor(current);
        }
        
        element.textContent = displayValue + suffix;
        
        // Add animation effect
        element.style.transform = 'scale(1.1)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 50);
        
    }, duration / steps);
}

// Animate team members on hover
function animateTeamMembers() {
    const teamMembers = document.querySelectorAll('.team-member');
    
    teamMembers.forEach(member => {
        member.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
            this.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)';
            
            // Animate avatar
            const avatar = this.querySelector('.member-avatar');
            if (avatar) {
                avatar.style.transform = 'scale(1.1)';
            }
        });
        
        member.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 10px 20px rgba(0,0,0,0.05)';
            
            // Reset avatar
            const avatar = this.querySelector('.member-avatar');
            if (avatar) {
                avatar.style.transform = 'scale(1)';
            }
        });
    });
}

// Setup smooth scrolling
function setupSmoothScrolling() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href !== '#') {
                e.preventDefault();
                const targetElement = document.querySelector(href);
                
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.about-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `about-notification notification-${type}`;
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

// Export functions
window.animateStats = animateStats;
window.animateTeamMembers = animateTeamMembers;