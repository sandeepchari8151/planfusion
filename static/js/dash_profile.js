document.addEventListener("DOMContentLoaded", function () {
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);

    const navItems = $$('.nav-item');
    const dashboardSections = $$('.dashboard-section');
    const tabButtons = $$(".card-buttons button");
    const tabSections = $$(".tabbed-details-card .card-section");
    const editBtn = $('#editProfileBtn');
    const profileModal = $('#profileModal');
    const form = $("#editProfileForm");
    const avatar = $('#profileAvatar');
    const fileInput = $('#avatarUpload');
    const socialDisplay = $(".card-social.social-display");
    const socialEdit = $(".card-social.social-edit");
    const block1Card = $(".card.block-1");
    const block2Card = $(".card.block-2");
    const editableElements = $$('.editable');
    const socialEditInputs = socialEdit?.querySelectorAll("input") || [];

    // Get all necessary elements for modal
    const editProfileBtn = document.getElementById('editProfileBtn');
    const editProfileModal = document.getElementById('editProfileModal');
    const editProfileForm = document.getElementById('editProfileForm');
    const closeBtn = document.querySelector('#editProfileModal .close-button');
    const cancelBtn = document.querySelector('#editProfileModal .cancel-button');
    const saveBtn = document.querySelector('.save-button');
    const avatarInput = document.getElementById('editAvatar');
    const avatarPreview = document.getElementById('editAvatarPreview');
    const profileAvatar = document.getElementById('profileAvatar');
    
    // State
    let isEditing = false;
    let originalValues = {};
    let socialEditEnabledByFocus = false;
    let newAvatarFile = null;

    // Function to adjust card height based on content
    function adjustCardHeight(cardElement) {
        if (cardElement) {
            cardElement.style.height = 'auto';
            cardElement.style.height = `${cardElement.offsetHeight}px`;
        }
    }

    // Listen for input changes in editable elements within block-1
    block1Card?.querySelectorAll('.editable').forEach(editable => {
        editable.addEventListener('input', debounce(() => adjustCardHeight(block1Card), 150));
    });

    // Listen for input changes in editable elements within block-2
    block2Card?.querySelectorAll('.editable').forEach(editable => {
        editable.addEventListener('input', debounce(() => adjustCardHeight(block2Card), 150));
    });

    // Listen for input changes in social edit fields
    socialEditInputs.forEach(input => {
        input.addEventListener('input', debounce(() => adjustCardHeight(block1Card), 150));
    });

    // Navigation switching
    navItems.forEach(item => {
        item.addEventListener('click', function () {
            const targetId = this.dataset.target;
            dashboardSections.forEach(section => section.classList.remove('active'));
            $('#' + targetId)?.classList.add('active');

            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            adjustCardHeight(block1Card);
            adjustCardHeight(block2Card);
        });
    });

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const target = button.dataset.section;
            tabButtons.forEach(btn => btn.classList.remove("is-active"));
            tabSections.forEach(sec => sec.classList.remove("is-active"));
            button.classList.add("is-active");
            $(target)?.classList.add("is-active");

            adjustCardHeight(block1Card);
            adjustCardHeight(block2Card);
        });
    });

    // Initial height adjustment on load
    adjustCardHeight(block1Card);
    adjustCardHeight(block2Card);

    // Debounced resize
    window.addEventListener('resize', debounce(() => {
        adjustCardHeight(block1Card);
        adjustCardHeight(block2Card);
    }, 150));

    // Function to switch to edit mode for social URLs
    function enableSocialEdit() {
        if (socialDisplay && socialEdit) {
            socialDisplay.style.display = "none";
            socialEdit.style.display = "block";
            adjustCardHeight(block1Card);
        }
    }

    // Function to switch back to display mode for social URLs
    function disableSocialEdit() {
        if (socialDisplay && socialEdit) {
            socialDisplay.style.display = "block";
            socialEdit.style.display = "none";
            adjustCardHeight(block1Card);
        }
    }

    // Listen for focus on editable fields to potentially enable social URL editing
    document.querySelectorAll('.editable').forEach(el => {
        el.addEventListener('focus', () => {
            socialEditEnabledByFocus = true;
            enableSocialEdit();
        });

        el.addEventListener('blur', () => {
            const activeElement = document.activeElement;
            const isEditing = activeElement === editBtn || 
                            activeElement.closest('#editProfileForm') ||
                            activeElement.closest('.editable');
            
            if (!isEditing) {
                socialEditEnabledByFocus = false;
                disableSocialEdit();
            }
        });
    });

    // Listen for focus on modal inputs/textareas to enable social edit
    if (form) {
        form.querySelectorAll('input, textarea').forEach(el => {
            el.addEventListener('focus', () => {
                socialEditEnabledByFocus = true;
                enableSocialEdit();
            });

            el.addEventListener('blur', () => {
                const activeElement = document.activeElement;
                const isEditing = activeElement === editBtn || 
                                activeElement.closest('#editProfileForm') ||
                                activeElement.closest('.editable');
                
                if (!isEditing) {
                    socialEditEnabledByFocus = false;
                    disableSocialEdit();
                }
            });
        });
    }
    
    // Function to open modal
    function openModal() {
        if (editProfileModal) {
            editProfileModal.style.display = 'flex';
            setTimeout(() => {
                editProfileModal.classList.add('show');
            }, 10);
        }
    }
    
    // Function to close modal
    function closeModal(e) {
        if (e) {
            e.preventDefault();
        }
        if (editProfileModal) {
            editProfileModal.classList.remove('show');
            setTimeout(() => {
                editProfileModal.style.display = 'none';
            }, 300);
        }
    }
    
    // Function to handle avatar preview
    function handleAvatarPreview(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                avatarPreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    // Add click handler for avatar preview
    if (avatarPreview) {
        avatarPreview.addEventListener('click', () => {
            avatarInput.click();
        });
    }

    // Add change handler for avatar input
    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
                if (!allowedTypes.includes(file.type)) {
                    showAlert('Please select a valid image file (JPEG, PNG, or GIF)', 'danger');
                    return;
                }

                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showAlert('File size should be less than 5MB', 'danger');
                    return;
                }

                newAvatarFile = file;
                
                // Create a temporary URL for the selected file
                const tempUrl = URL.createObjectURL(file);
                
                // Update specific avatar elements
                const profileAvatar = document.getElementById('profileAvatar');
                const editAvatarPreview = document.getElementById('editAvatarPreview');
                const navAvatar = document.getElementById('profile-toggle-avatar');
                
                if (profileAvatar) profileAvatar.src = tempUrl;
                if (editAvatarPreview) editAvatarPreview.src = tempUrl;
                if (navAvatar) navAvatar.src = tempUrl;

                // Update any other avatar images
                document.querySelectorAll('.card-avatar, .avatar-preview').forEach(avatar => {
                    if (avatar.id !== 'profileAvatar' && avatar.id !== 'editAvatarPreview') {
                        avatar.src = tempUrl;
                    }
                });
            }
        });
    }

    // Function to save profile changes
    async function saveProfileChanges() {
        if (!editProfileForm) return;

        try {
            const formData = new FormData(editProfileForm);
            
            // If there's a new avatar file, upload it first
            if (newAvatarFile) {
                const avatarFormData = new FormData();
                avatarFormData.append('avatar', newAvatarFile);
                
                const avatarResponse = await fetch('/upload_avatar', {
                    method: 'POST',
                    body: avatarFormData
                });
                
                const avatarResult = await avatarResponse.json();
                if (!avatarResult.success) {
                    throw new Error(avatarResult.error || 'Failed to upload avatar');
                }
                
                // Update avatars immediately with the new URL
                const newAvatarUrl = avatarResult.avatar_url;
                
                // Update specific avatar elements
                const profileAvatar = document.getElementById('profileAvatar');
                const editAvatarPreview = document.getElementById('editAvatarPreview');
                const navAvatar = document.getElementById('profile-toggle-avatar');
                
                if (profileAvatar) profileAvatar.src = newAvatarUrl;
                if (editAvatarPreview) editAvatarPreview.src = newAvatarUrl;
                if (navAvatar) navAvatar.src = newAvatarUrl;

                // Update any other avatar images
                document.querySelectorAll('.card-avatar, .avatar-preview').forEach(avatar => {
                    if (avatar.id !== 'profileAvatar' && avatar.id !== 'editAvatarPreview') {
                        avatar.src = newAvatarUrl;
                    }
                });
                
                // Add the avatar URL to the profile form data
                formData.append('avatar_url', avatarResult.avatar_url);
            }

            // Send the profile data to the server
            const response = await fetch('/profile', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Update profile display
                const updateElement = (selector, value) => {
                    const element = document.querySelector(selector);
                    if (element) element.textContent = value;
                };

                // Update profile information
                updateElement('.card-fullname', formData.get('full_name'));
                updateElement('.card-jobtitle', formData.get('job_title'));
                updateElement('.card-desc', formData.get('bio'));
                updateElement('.contact-address .contact-text', formData.get('address'));
                updateElement('.contact-phone .contact-text', formData.get('phone'));
                updateElement('.contact-email .contact-text', formData.get('email'));

                // Update social media links
                const updateSocialLink = (platform, url) => {
                    const link = document.querySelector(`.card-social a[href*="${platform}"]`);
                    if (link) link.href = url;
                };

                updateSocialLink('linkedin', formData.get('linkedin_url'));
                updateSocialLink('twitter', formData.get('twitter_url'));
                updateSocialLink('instagram', formData.get('instagram_url'));
                updateSocialLink('facebook', formData.get('facebook_url'));

                showAlert('Profile updated successfully', 'success');
                closeModal();
            } else {
                showAlert(result.error || 'Failed to update profile', 'danger');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            showAlert('An error occurred while updating the profile', 'danger');
        }
    }

    // Function to show alert
    function showAlert(message, type = 'success') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        document.body.appendChild(alert);
        
        // Show alert
        setTimeout(() => {
            alert.classList.add('show');
        }, 100);
        
        // Remove alert after 3 seconds
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(alert);
            }, 300);
        }, 3000);
    }

    // Event Listeners
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openModal();
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeModal();
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeModal();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveProfileChanges();
        });
    }

    // Close modal when clicking outside
    if (editProfileModal) {
        editProfileModal.addEventListener('click', function(e) {
            if (e.target === editProfileModal) {
                closeModal();
            }
        });
    }

    // Handle form submission
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveProfileChanges();
        });
    }

    // Debounce helper
    function debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Adjust height after initial content load
    window.addEventListener('load', () => {
        adjustCardHeight(block1Card);
        adjustCardHeight(block2Card);
    });

    // Initialize
    initializeProfile();
    setupEventListeners();
    setupSocialMediaLinks();

    function initializeProfile() {
        editableElements.forEach(el => {
            originalValues[el.dataset.field || el.className] = el.textContent.trim();
        });
        updateSocialMediaDisplay();
    }

    function setupEventListeners() {
        editableElements.forEach(el => {
            el.addEventListener('focus', () => {
                if (!isEditing) {
                    enterEditMode();
                }
            });
        });
    }

    function setupSocialMediaLinks() {
        socialDisplay?.addEventListener('click', () => {
            if (!isEditing) {
                socialDisplay.style.display = 'none';
                socialEdit.style.display = 'block';
                enterEditMode();
            }
        });

        socialEditInputs.forEach(input => {
            input.addEventListener('input', () => {
                validateSocialUrl(input);
            });
        });
    }

    function validateSocialUrl(input) {
        const url = input.value.trim();
        const platform = input.dataset.field.split('_')[0];
        const isValid = validateUrlForPlatform(url, platform);
        
        input.style.borderColor = isValid ? '#ccc' : '#ff4444';
        return isValid;
    }

    function validateUrlForPlatform(url, platform) {
        if (!url) return true;
        const patterns = {
            linkedin: /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/,
            twitter: /^https?:\/\/(www\.)?twitter\.com\/[a-zA-Z0-9_]+\/?$/,
            instagram: /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_]+\/?$/,
            facebook: /^https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9.]+\/?$/
        };
        return patterns[platform]?.test(url) || false;
    }

    function enterEditMode() {
        isEditing = true;
        editableElements.forEach(el => {
            el.contentEditable = true;
            el.classList.add('editing');
        });
    }

    function updateSocialMediaDisplay() {
        if (socialDisplay && socialEdit) {
            socialDisplay.style.display = 'block';
            socialEdit.style.display = 'none';
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const editableElements = document.querySelectorAll('.editable');

    editableElements.forEach(element => {
        const placeholder = element.getAttribute('data-placeholder');

        function checkPlaceholder() {
            if (element.textContent.trim() === '') {
                element.textContent = placeholder;
                element.classList.add('placeholder');
            } else {
                element.classList.remove('placeholder');
            }
        }

        element.addEventListener('focus', function() {
            if (element.classList.contains('placeholder')) {
                element.textContent = '';
                element.classList.remove('placeholder');
            }
        });

        element.addEventListener('blur', checkPlaceholder);

        // Initial check
        checkPlaceholder();
    });
});