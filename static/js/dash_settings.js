// Settings Modal Functionality
document.addEventListener('DOMContentLoaded', function() {
    const settingsModal = document.getElementById('settingsModal');
    const settingsModalBtn = document.getElementById('settingsModalBtn');
    const closeButton = settingsModal.querySelector('.close-button');

    // Initialize all settings
    initSettings();

    // Modal open/close handlers
    settingsModalBtn.addEventListener('click', () => {
        settingsModal.style.display = 'block';
        setTimeout(() => settingsModal.classList.add('show'), 10);
    });

    closeButton.addEventListener('click', () => {
        settingsModal.classList.remove('show');
        setTimeout(() => settingsModal.style.display = 'none', 300);
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('show');
            setTimeout(() => settingsModal.style.display = 'none', 300);
        }
    });
});

function initSettings() {
    // Initialize all settings toggles and selects
    initDisplaySettings();
    initLanguageSettings();
    initAccessibilitySettings();
    initNotificationSettings();
}

function initDisplaySettings() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const fontSizeSelect = document.getElementById('fontSizeSelect');

    // Load saved preferences from API
    fetch('/api/user/settings')
        .then(response => response.json())
        .then(settings => {
            const display = settings.display;
            darkModeToggle.checked = display.dark_mode;
            fontSizeSelect.value = display.font_size;
            toggleDarkMode(display.dark_mode);
            applyFontSize(display.font_size);
        })
        .catch(error => console.error('Error loading display settings:', error));

    // Add event listeners
    darkModeToggle.addEventListener('change', (e) => {
        toggleDarkMode(e.target.checked);
        saveSettings({
            display: {
                dark_mode: e.target.checked
            }
        });
    });

    fontSizeSelect.addEventListener('change', (e) => {
        applyFontSize(e.target.value);
        saveSettings({
            display: {
                font_size: e.target.value
            }
        });
    });
}

function initLanguageSettings() {
    const languageSelect = document.getElementById('languageSelect');
    const dateFormatSelect = document.getElementById('dateFormatSelect');
    const timeFormatSelect = document.getElementById('timeFormatSelect');

    // Load saved preferences from API
    fetch('/api/user/settings')
        .then(response => response.json())
        .then(settings => {
            const language = settings.language;
            languageSelect.value = language.interface_language;
            dateFormatSelect.value = language.date_format;
            timeFormatSelect.value = language.time_format;
        })
        .catch(error => console.error('Error loading language settings:', error));

    // Add event listeners
    languageSelect.addEventListener('change', (e) => {
        saveSettings({
            language: {
                interface_language: e.target.value
            }
        });
        // Here you would typically reload the page or update the UI language
    });

    dateFormatSelect.addEventListener('change', (e) => {
        updateDateFormats(e.target.value);
        saveSettings({
            language: {
                date_format: e.target.value
            }
        });
    });

    timeFormatSelect.addEventListener('change', (e) => {
        updateTimeFormats(e.target.value);
        saveSettings({
            language: {
                time_format: e.target.value
            }
        });
    });
}

function initAccessibilitySettings() {
    const highContrastToggle = document.getElementById('highContrastToggle');
    const reduceMotionToggle = document.getElementById('reduceMotionToggle');
    const focusIndicatorsToggle = document.getElementById('focusIndicatorsToggle');

    // Load saved preferences from API
    fetch('/api/user/settings')
        .then(response => response.json())
        .then(settings => {
            const accessibility = settings.accessibility;
            highContrastToggle.checked = accessibility.high_contrast;
            reduceMotionToggle.checked = accessibility.reduce_motion;
            focusIndicatorsToggle.checked = accessibility.focus_indicators;
        })
        .catch(error => console.error('Error loading accessibility settings:', error));

    // Add event listeners
    highContrastToggle.addEventListener('change', (e) => {
        applyAccessibilitySetting('highContrast', e.target.checked);
        saveSettings({
            accessibility: {
                high_contrast: e.target.checked
            }
        });
    });

    reduceMotionToggle.addEventListener('change', (e) => {
        applyAccessibilitySetting('reduceMotion', e.target.checked);
        saveSettings({
            accessibility: {
                reduce_motion: e.target.checked
            }
        });
    });

    focusIndicatorsToggle.addEventListener('change', (e) => {
        applyAccessibilitySetting('focusIndicators', e.target.checked);
        saveSettings({
            accessibility: {
                focus_indicators: e.target.checked
            }
        });
    });
}

function initNotificationSettings() {
    const pushNotificationToggle = document.getElementById('pushNotificationToggle');
    const emailNotificationToggle = document.getElementById('emailNotificationToggle');
    const dailyTaskReminderToggle = document.getElementById('dailyTaskReminderToggle');
    const dueDateReminderToggle = document.getElementById('dueDateReminderToggle');
    const completionNotificationToggle = document.getElementById('completionNotificationToggle');
    const testNotificationBtn = document.getElementById('testNotificationBtn');

    // Load saved preferences from API
    fetch('/api/user/notification-preferences')
        .then(response => response.json())
        .then(preferences => {
            pushNotificationToggle.checked = preferences.push_notifications;
            emailNotificationToggle.checked = preferences.email_notifications;
            dailyTaskReminderToggle.checked = preferences.daily_task_reminders;
            dueDateReminderToggle.checked = preferences.due_date_reminders;
            completionNotificationToggle.checked = preferences.completion_notifications;
        })
        .catch(error => console.error('Error loading notification preferences:', error));

    // Add event listeners for toggles
    [pushNotificationToggle, emailNotificationToggle, dailyTaskReminderToggle, 
     dueDateReminderToggle, completionNotificationToggle].forEach(toggle => {
        toggle.addEventListener('change', saveNotificationPreferences);
    });

    // Test notification button
    testNotificationBtn.addEventListener('click', () => {
        fetch('/api/test-notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Test notification sent successfully!', 'success');
            } else {
                showToast('Failed to send test notification', 'error');
            }
        })
        .catch(error => {
            console.error('Error sending test notification:', error);
            showToast('Error sending test notification', 'error');
        });
    });
}

function saveNotificationPreferences() {
    const preferences = {
        push_notifications: document.getElementById('pushNotificationToggle').checked,
        email_notifications: document.getElementById('emailNotificationToggle').checked,
        daily_task_reminders: document.getElementById('dailyTaskReminderToggle').checked,
        due_date_reminders: document.getElementById('dueDateReminderToggle').checked,
        completion_notifications: document.getElementById('completionNotificationToggle').checked
    };

    fetch('/api/user/notification-preferences', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Notification preferences saved successfully!', 'success');
        } else {
            showToast('Failed to save notification preferences', 'error');
        }
    })
    .catch(error => {
        console.error('Error saving notification preferences:', error);
        showToast('Error saving notification preferences', 'error');
    });
}

// Helper Functions
function toggleDarkMode(enabled) {
    document.body.classList.toggle('dark-mode', enabled);
}

function applyFontSize(size) {
    document.documentElement.setAttribute('data-font-size', size);
}

function updateDateFormats(format) {
    // Update all date displays in the application
    const dateElements = document.querySelectorAll('[data-date]');
    dateElements.forEach(element => {
        const date = new Date(element.dataset.date);
        element.textContent = formatDate(date, format);
    });
}

function updateTimeFormats(format) {
    // Update all time displays in the application
    const timeElements = document.querySelectorAll('[data-time]');
    timeElements.forEach(element => {
        const time = new Date(element.dataset.time);
        element.textContent = formatTime(time, format);
    });
}

function applyAccessibilitySetting(setting, enabled) {
    switch (setting) {
        case 'highContrast':
            document.body.classList.toggle('high-contrast', enabled);
            break;
        case 'reduceMotion':
            document.body.classList.toggle('reduce-motion', enabled);
            break;
        case 'focusIndicators':
            document.body.classList.toggle('show-focus', enabled);
            break;
    }
}

function formatDate(date, format) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    switch (format) {
        case 'MM/DD/YYYY':
            return `${month}/${day}/${year}`;
        case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        default:
            return `${month}/${day}/${year}`;
    }
}

function formatTime(date, format) {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');

    if (format === '12h') {
        const period = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes} ${period}`;
    } else {
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Search functionality
const searchBox = document.querySelector('.search-box');
const searchInput = document.querySelector('.input-search');
const searchButton = document.querySelector('.btn-search');

// Create search results dropdown
const searchResults = document.createElement('div');
searchResults.className = 'search-results';
searchBox.appendChild(searchResults);

// Initialize search functionality
function initSearch() {
    // Focus input when clicking the search button
    searchButton.addEventListener('click', () => {
        searchInput.focus();
    });

    // Handle input focus
    searchInput.addEventListener('focus', () => {
        searchBox.classList.add('active');
        searchInput.style.width = '300px';
        searchInput.style.padding = '10px 40px 10px 20px';
    });

    // Handle input blur
    searchInput.addEventListener('blur', () => {
        if (!searchInput.value) {
            searchBox.classList.remove('active');
            searchInput.style.width = '50px';
            searchInput.style.padding = '10px';
        }
    });

    // Handle search input
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        performSearch(searchTerm);
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchBox.contains(e.target)) {
            searchResults.classList.remove('show');
        }
    });
}

// Perform search across the dashboard
function performSearch(searchTerm) {
    if (!searchTerm) {
        clearSearchResults();
        return;
    }

    const searchableItems = [
        // Main Sections
        { id: 'home', title: 'Dashboard', icon: 'ri-dashboard-line', type: 'section' },
        { id: 'tasks', title: 'Tasks', icon: 'ri-task-line', type: 'section' },
        { id: 'skills', title: 'Skills', icon: 'ri-briefcase-line', type: 'section' },
        { id: 'networking', title: 'Networking', icon: 'ri-group-line', type: 'section' },
        { id: 'settings', title: 'Settings', icon: 'ri-settings-3-line', type: 'section' },
        
        // Dashboard-related items
        { id: 'home', title: 'View Dashboard', icon: 'ri-dashboard-line', type: 'action' },
        { id: 'home', title: 'Task Progress', icon: 'ri-progress-1-line', type: 'action' },
        { id: 'home', title: 'Recent Activity', icon: 'ri-time-line', type: 'action' },
        
        // Task-related items
        { id: 'tasks', title: 'Add Task', icon: 'ri-add-line', type: 'action' },
        { id: 'tasks', title: 'View Tasks', icon: 'ri-list-check', type: 'action' },
        { id: 'tasks', title: 'Task Priority', icon: 'ri-flag-line', type: 'action' },
        { id: 'tasks', title: 'Task Due Date', icon: 'ri-calendar-line', type: 'action' },
        { id: 'tasks', title: 'Task Reminder', icon: 'ri-notification-line', type: 'action' },
        
        // Skills-related items
        { id: 'skills', title: 'Add Skill', icon: 'ri-add-line', type: 'action' },
        { id: 'skills', title: 'Skill Progress', icon: 'ri-progress-1-line', type: 'action' },
        { id: 'skills', title: 'Skill Level', icon: 'ri-bar-chart-line', type: 'action' },
        { id: 'skills', title: 'Skill Notes', icon: 'ri-file-list-line', type: 'action' },
        { id: 'skills', title: 'Skill Certificates', icon: 'ri-award-line', type: 'action' },
        
        // Networking-related items
        { id: 'networking', title: 'Add Contact', icon: 'ri-user-add-line', type: 'action' },
        { id: 'networking', title: 'View Contacts', icon: 'ri-contacts-line', type: 'action' },
        { id: 'networking', title: 'Network Goals', icon: 'ri-target-line', type: 'action' },
        { id: 'networking', title: 'Recent Interactions', icon: 'ri-message-2-line', type: 'action' },
        
        // Settings-related items
        { id: 'settingsModal', title: 'Open Settings', icon: 'ri-settings-3-line', type: 'action' },
        { id: 'settings', title: 'Dark Mode', icon: 'ri-moon-line', type: 'setting' },
        { id: 'settings', title: 'Notifications', icon: 'ri-notification-3-line', type: 'setting' },
        { id: 'settings', title: 'Data Export', icon: 'ri-download-line', type: 'setting' },
        { id: 'settings', title: 'Layout Settings', icon: 'ri-layout-line', type: 'setting' }
    ];

    const results = searchableItems.filter(item => 
        item.title.toLowerCase().includes(searchTerm) ||
        item.id.toLowerCase().includes(searchTerm) ||
        item.type.toLowerCase().includes(searchTerm)
    );

    displaySearchResults(results);
}

// Display search results
function displaySearchResults(results) {
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
        searchResults.classList.remove('show');
        return;
    }

    // Group results by type
    const groupedResults = results.reduce((acc, result) => {
        if (!acc[result.type]) {
            acc[result.type] = [];
        }
        acc[result.type].push(result);
        return acc;
    }, {});

    // Create sections for each type
    Object.entries(groupedResults).forEach(([type, items]) => {
        const section = document.createElement('div');
        section.className = 'search-results-section';
        
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'search-results-title';
        sectionTitle.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        section.appendChild(sectionTitle);

        items.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <i class="${result.icon}"></i>
                <span>${result.title}</span>
            `;

            resultItem.addEventListener('click', () => {
                if (result.id === 'settingsModal') {
                    // Open settings modal
                    const settingsModal = document.getElementById('settingsModal');
                    if (settingsModal) {
                        settingsModal.style.display = 'block';
                        setTimeout(() => {
                            settingsModal.classList.add('show');
                        }, 10);
                    }
                } else {
                    // Find the corresponding section
                    const section = document.getElementById(result.id);
                    if (section) {
                        // Hide all sections
                        document.querySelectorAll('.dashboard-section').forEach(s => {
                            s.classList.remove('active');
                        });
                        
                        // Show the selected section
                        section.classList.add('active');
                        
                        // Update navigation
                        document.querySelectorAll('.nav-item').forEach(item => {
                            item.classList.toggle('active', item.getAttribute('data-target') === result.id);
                        });

                        // Scroll to the section
                        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
                
                // Clear the search input and hide results
                searchInput.value = '';
                searchResults.classList.remove('show');
                searchBox.classList.remove('active');
                searchInput.style.width = '50px';
                searchInput.style.padding = '10px';
            });

            section.appendChild(resultItem);
        });

        searchResults.appendChild(section);
    });

    searchResults.classList.add('show');
}

// Clear search results
function clearSearchResults() {
    searchResults.innerHTML = '';
    searchResults.classList.remove('show');
}

// Initialize settings modal
function initSettingsModal() {
    const settingsModal = document.getElementById('settingsModal');
    const closeButton = settingsModal.querySelector('.close-button');
    
    // Close modal when clicking the close button
    closeButton.addEventListener('click', () => {
        settingsModal.classList.remove('show');
        setTimeout(() => {
            settingsModal.style.display = 'none';
        }, 300);
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('show');
            setTimeout(() => {
                settingsModal.style.display = 'none';
            }, 300);
        }
    });
}

// Notification functionality
function initNotifications() {
    const notificationLink = document.querySelector('.notification-link');
    const notificationDropdown = document.querySelector('.notification-dropdown');
    const clearNotificationsBtn = document.querySelector('.clear-notifications');
    const pendingList = document.querySelector('.pending-list');
    const completedList = document.querySelector('.completed-list');

    // Only initialize if notification elements exist
    if (notificationLink && notificationDropdown) {
        // Toggle notification dropdown
        notificationLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            notificationDropdown.classList.toggle('show');
            // Refresh notifications when dropdown is opened
            if (notificationDropdown.classList.contains('show')) {
                fetchAndUpdateNotifications();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!notificationLink.contains(e.target) && !notificationDropdown.contains(e.target)) {
                notificationDropdown.classList.remove('show');
            }
        });

        // Clear all notifications if button exists
        if (clearNotificationsBtn) {
            clearNotificationsBtn.addEventListener('click', () => {
                if (pendingList) pendingList.innerHTML = '';
                if (completedList) completedList.innerHTML = '';
                updateNotificationBadge(0);
                notificationDropdown.classList.remove('show');
            });
        }

        // Initial fetch of notifications
        fetchAndUpdateNotifications();
        
        // Set up periodic refresh (every 5 minutes)
        setInterval(fetchAndUpdateNotifications, 5 * 60 * 1000);
    }
}

async function fetchAndUpdateNotifications() {
    try {
        const response = await fetch('/dashboard_data');
        const data = await response.json();
        
        // Clear existing notifications
        const pendingList = document.querySelector('.pending-list');
        const completedList = document.querySelector('.completed-list');
        if (pendingList) pendingList.innerHTML = '';
        if (completedList) completedList.innerHTML = '';

        let totalNotifications = 0;

        // Add task notifications
        if (data.task_data) {
            // Add pending tasks
            if (data.task_data.pending_tasks_list && data.task_data.pending_tasks_list.length > 0) {
                totalNotifications += data.task_data.pending_tasks_list.length;
                data.task_data.pending_tasks_list.forEach(task => {
                    let message = '';
                    let dueText = task.due_date ? ` (Due: ${task.due_date})` : '';
                    let extraClass = '';
                    if (task.priority && task.priority.toLowerCase() === 'high') {
                        message = `⚠️ <b>${task.name}</b>${dueText} — <span style=\"color:#d32f2f\">You have forgotten this high priority task!</span>`;
                        extraClass = 'high-priority-notification';
                    } else if (task.priority && task.priority.toLowerCase() === 'medium') {
                        message = `🟡 <b>${task.name}</b>${dueText} — <span style=\"color:#b8860b\">This task needs your attention soon!</span>`;
                        extraClass = 'medium-priority-notification';
                    } else {
                        message = `<b>${task.name}</b>${dueText} — Don't forget to complete this task!`;
                    }
                    addNotification(message, 'pending', extraClass);
                });
            }

            // Add completed tasks
            if (data.task_data.completed > 0) {
                addNotification(
                    `You've completed ${data.task_data.completed} task${data.task_data.completed > 1 ? 's' : ''} (${data.task_data.completion_percentage}%)`,
                    'completed'
                );
            }
        }

        // Add in-progress skills notifications
        if (data.skill_data) {
            // Add in-progress skills
            if (data.skill_data.in_progress_skills_list && data.skill_data.in_progress_skills_list.length > 0) {
                totalNotifications += data.skill_data.in_progress_skills_list.length;
                data.skill_data.in_progress_skills_list.forEach(skill => {
                    let endDateText = skill.expectedEndDate ? ` (Ends: ${skill.expectedEndDate})` : '';
                    let message = `<b>${skill.name}</b>${endDateText} — Keep going, you're making progress!`;
                    addNotification(message, 'pending');
                });
            }

            // Add completed skills
            if (data.skill_data.completed > 0) {
                addNotification(
                    `You've completed ${data.skill_data.completed} skill${data.skill_data.completed > 1 ? 's' : ''} (${data.skill_data.completion_percentage}%)`,
                    'completed'
                );
            }
        }

        // Add upcoming meetings notifications
        if (data.network_data && data.network_data.upcoming_meetings && data.network_data.upcoming_meetings.length > 0) {
            totalNotifications += data.network_data.upcoming_meetings.length;
            data.network_data.upcoming_meetings.forEach(meeting => {
                if (meeting && meeting.contact_name) {
                    addNotification(
                        `Next meeting: ${meeting.contact_name}${meeting.next_meeting ? ` on ${new Date(meeting.next_meeting).toLocaleDateString()}` : ''}`,
                        'pending'
                    );
                }
            });
        }

        // Add incomplete goals notifications
        if (data.network_data && data.network_data.goals && data.network_data.goals.by_type) {
            Object.entries(data.network_data.goals.by_type).forEach(([type, typeData]) => {
                if (typeData.goals) {
                    const incompleteGoals = typeData.goals.filter(goal => goal.completed === 0);
                    totalNotifications += incompleteGoals.length;
                    if (incompleteGoals.length > 0) {
                        addNotification(
                            `You have ${incompleteGoals.length} incomplete ${type} goal${incompleteGoals.length > 1 ? 's' : ''}`,
                            'pending'
                        );
                    }
                }
            });
        }

        // If no notifications, show a message
        if (pendingList && pendingList.children.length === 0 && completedList && completedList.children.length === 0) {
            addNotification('No recent activities to show', 'completed');
        }

        // Update badge count with the total number of notifications
        updateNotificationBadge(totalNotifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        showToast('Failed to load notifications', 'error');
    }
}

function addNotification(message, type = 'pending', extraClass = '') {
    const notificationList = type === 'pending' 
        ? document.querySelector('.pending-list')
        : document.querySelector('.completed-list');
    
    if (notificationList) {
        const notificationItem = document.createElement('div');
        notificationItem.className = 'notification-item' + (extraClass ? ' ' + extraClass : '');
        notificationItem.innerHTML = `
            <div class="notification-content">
                <p>${message}</p>
            </div>
        `;
        
        notificationList.appendChild(notificationItem);
    }
}

function updateNotificationBadge(count) {
    const badge = document.querySelector('.notification-link .badge');
    if (badge) {
        if (count !== undefined) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        } else {
            // Count notifications in the same way as the backend
            const pendingTasks = document.querySelectorAll('.pending-list .notification-item').length;
            const inProgressSkills = document.querySelectorAll('.pending-list .notification-item').length;
            const upcomingMeetings = document.querySelectorAll('.pending-list .notification-item').length;
            const incompleteGoals = document.querySelectorAll('.pending-list .notification-item').length;
            
            const totalNotifications = pendingTasks + inProgressSkills + upcomingMeetings + incompleteGoals;
            badge.textContent = totalNotifications;
            badge.style.display = totalNotifications > 0 ? 'flex' : 'none';
        }
    }
}

// Profile Section Functionality
function initProfileSection() {
    const editProfileBtn = document.querySelector('.edit-profile-btn');
    const saveProfileBtn = document.querySelector('.save-profile-btn');
    const cancelProfileBtn = document.querySelector('.cancel-profile-btn');
    const profileInfo = document.querySelector('.profile-info');
    const profileForm = document.querySelector('.profile-form');

    if (editProfileBtn && profileInfo && profileForm) {
        editProfileBtn.addEventListener('click', () => {
            // Hide profile info and show form
            profileInfo.style.display = 'none';
            profileForm.style.display = 'block';
            
            // Focus on the first input field
            const firstInput = profileForm.querySelector('input');
            if (firstInput) {
                firstInput.focus();
            }
        });
    }

    if (saveProfileBtn && profileInfo && profileForm) {
        saveProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(profileForm);
            const profileData = {};
            formData.forEach((value, key) => {
                profileData[key] = value;
            });

            // Update profile info
            Object.entries(profileData).forEach(([key, value]) => {
                const infoElement = profileInfo.querySelector(`[data-field="${key}"]`);
                if (infoElement) {
                    infoElement.textContent = value;
                }
            });

            // Show success message
            showToast('Profile updated successfully', 'success');

            // Hide form and show profile info
            profileForm.style.display = 'none';
            profileInfo.style.display = 'block';
        });
    }

    if (cancelProfileBtn && profileInfo && profileForm) {
        cancelProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Hide form and show profile info
            profileForm.style.display = 'none';
            profileInfo.style.display = 'block';
        });
    }
}

// Function to show notification messages
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="ri-${type === 'success' ? 'check' : 'error'}-line"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function saveSettings(settings) {
    fetch('/api/user/settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            showToast('Settings saved successfully!', 'success');
        } else {
            showToast('Failed to save settings', 'error');
        }
    })
    .catch(error => {
        console.error('Error saving settings:', error);
        showToast('Error saving settings', 'error');
    });
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initProfileSection();
    initNotifications();
    initSearch();
    initSettingsModal();
}); 