document.addEventListener('DOMContentLoaded', function() {
    // Load saved notification preferences
    loadNotificationPreferences();

    // Add event listeners for notification toggles
    document.getElementById('pushNotificationToggle').addEventListener('change', saveNotificationPreferences);
    document.getElementById('emailNotificationToggle').addEventListener('change', saveNotificationPreferences);
    document.getElementById('dailyTaskReminderToggle').addEventListener('change', saveNotificationPreferences);
    document.getElementById('dueDateReminderToggle').addEventListener('change', saveNotificationPreferences);
    document.getElementById('completionNotificationToggle').addEventListener('change', saveNotificationPreferences);
});

async function loadNotificationPreferences() {
    try {
        const response = await fetch('/api/user/notification-preferences');
        if (response.ok) {
            const preferences = await response.json();
            
            // Set toggle states
            document.getElementById('pushNotificationToggle').checked = preferences.push_notifications;
            document.getElementById('emailNotificationToggle').checked = preferences.email_notifications;
            document.getElementById('dailyTaskReminderToggle').checked = preferences.daily_task_reminders;
            document.getElementById('dueDateReminderToggle').checked = preferences.due_date_reminders;
            document.getElementById('completionNotificationToggle').checked = preferences.completion_notifications;
        }
    } catch (error) {
        console.error('Error loading notification preferences:', error);
        showToast('Failed to load notification preferences', 'error');
    }
}

async function saveNotificationPreferences() {
    const preferences = {
        push_notifications: document.getElementById('pushNotificationToggle').checked,
        email_notifications: document.getElementById('emailNotificationToggle').checked,
        daily_task_reminders: document.getElementById('dailyTaskReminderToggle').checked,
        due_date_reminders: document.getElementById('dueDateReminderToggle').checked,
        completion_notifications: document.getElementById('completionNotificationToggle').checked
    };

    try {
        const response = await fetch('/api/user/notification-preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferences)
        });

        if (response.ok) {
            showToast('Notification preferences saved successfully', 'success');
        } else {
            throw new Error('Failed to save preferences');
        }
    } catch (error) {
        console.error('Error saving notification preferences:', error);
        showToast('Failed to save notification preferences', 'error');
    }
}

function showToast(message, type = 'info') {
    // Implement your toast notification system here
    console.log(`${type}: ${message}`);
} 