// Add at the beginning of the file
document.addEventListener('DOMContentLoaded', function() {
    // Add preload class to prevent transitions during page load
    document.body.classList.add('preload');

    // Remove preload class after page loads
    window.addEventListener('load', function() {
        document.body.classList.remove('preload');
        document.body.classList.add('loaded');

        // Handle image loading
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (img.complete) {
                img.classList.add('loaded');
            } else {
                img.addEventListener('load', function() {
                    img.classList.add('loaded');
                });
            }
        });
    });

    // Font loading optimization
    if (document.fonts) {
        document.fonts.ready.then(function() {
            document.documentElement.classList.add('wf-active');
        });
    } else {
        document.documentElement.classList.add('wf-active');
    }

    // Get DOM elements
    const learnMoreBtn = document.getElementById('learnMoreBtn');
    const overlay = document.getElementById('overlay');
    const closeBtn = document.getElementById('closeBtn');

    // Show overlay when Learn More is clicked
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', function() {
            overlay.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevent scrolling when overlay is shown
        });
    }

    // Hide overlay when Close button is clicked
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            overlay.classList.remove('show');
            document.body.style.overflow = ''; // Restore scrolling
        });
    }

    // Hide overlay when clicking outside the content
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.classList.remove('show');
                document.body.style.overflow = ''; // Restore scrolling
            }
        });
    }
}); 