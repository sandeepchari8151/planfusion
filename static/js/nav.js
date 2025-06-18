document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.getElementById('menu-btn');
    const navLinks = document.querySelector('.nav_links');
    const menuIcon = document.querySelector('.ri-menu-line');
    const dropdowns = document.querySelectorAll('.dropdown');

    // Check if all required elements exist
    if (!menuBtn || !navLinks || !menuIcon) {
        console.warn('One or more navigation elements not found');
        return;
    }

    // Function to toggle menu
    function toggleMenu() {
        navLinks.classList.toggle('open');
        const isOpen = navLinks.classList.contains('open');
        
        // Update menu icon
        menuIcon.classList.toggle('ri-close-line', isOpen);
        menuIcon.classList.toggle('ri-menu-line', !isOpen);
        
        // Close all dropdowns when closing the menu
        if (!isOpen) {
            closeAllDropdowns();
        }
        
        // Store menu state
        localStorage.setItem('menuState', isOpen ? 'open' : 'closed');
    }

    // Function to close all dropdowns
    function closeAllDropdowns() {
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('open');
        });
    }

    // Add click event listener for menu button
    menuBtn.addEventListener('click', toggleMenu);

    // Handle dropdown toggles
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        
        if (toggle) {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Close other dropdowns
                dropdowns.forEach(other => {
                    if (other !== dropdown) {
                        other.classList.remove('open');
                    }
                });
                
                // Toggle current dropdown
                dropdown.classList.toggle('open');
            });
        }
    });

    // Restore menu state on page load
    const savedMenuState = localStorage.getItem('menuState');
    if (savedMenuState === 'open') {
        navLinks.classList.add('open');
        menuIcon.classList.remove('ri-menu-line');
        menuIcon.classList.add('ri-close-line');
    }

    // Close menu and dropdowns when clicking outside
    document.addEventListener('click', function(event) {
        const isClickInsideNav = navLinks.contains(event.target);
        const isClickOnMenuBtn = menuBtn.contains(event.target);
        
        if (!isClickInsideNav && !isClickOnMenuBtn) {
            // Close mobile menu
            if (navLinks.classList.contains('open')) {
                toggleMenu();
            }
            // Close all dropdowns
            closeAllDropdowns();
        }
    });

    // Close menu and dropdowns when window is resized above mobile breakpoint
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            navLinks.classList.remove('open');
            menuIcon.classList.remove('ri-close-line');
            menuIcon.classList.add('ri-menu-line');
            closeAllDropdowns();
        }
    });
}); 