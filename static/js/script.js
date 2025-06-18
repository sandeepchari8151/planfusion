document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.querySelector('.nav_menu_btn');
    const navLinks = document.querySelector('.nav_links');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('show');
            
            // Update aria-expanded attribute for accessibility
            const isExpanded = navLinks.classList.contains('show');
            menuBtn.setAttribute('aria-expanded', isExpanded);
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!menuBtn.contains(event.target) && !navLinks.contains(event.target)) {
                navLinks.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            }
        });

        // Close menu when window is resized above mobile breakpoint
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                navLinks.classList.remove('show');
                menuBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }
}); 