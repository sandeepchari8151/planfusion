// Chart management system
const chartManager = {
    charts: {
        taskProgress: null,
        skillDev: null,
        networkGrowth: null
    },

    destroyAll: function() {
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key] && typeof this.charts[key].destroy === 'function') {
                try {
                    this.charts[key].destroy();
                } catch (error) {
                    console.error(`Error destroying ${key} chart:`, error);
                }
                this.charts[key] = null;
            }
        });
    },

    clearCanvas: function(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = canvas.width;
        }
    },

    clearAllCanvases: function() {
        this.clearCanvas('taskProgressChart');
        this.clearCanvas('skillProgressChart');
        this.clearCanvas('networkGrowthChart');
    }
};

// Initialize charts when the page loads
document.addEventListener('DOMContentLoaded', function() {
    setupNavigation();
    setupMenuLinks();
    fetchDashboardData();
    initializeProgressBars();

    // Set up periodic data refresh (every 5 minutes)
    setInterval(fetchDashboardData, 300000);

    // --- Navigation ---
    const navLinks = document.querySelectorAll('.nav_links .nav-item');
    const navLinksContainer = document.getElementById('nav-links');
    const dashboardSections = document.querySelectorAll('.dashboard-container > section');
    const menuBtn = document.getElementById('menu-btn');

    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const targetId = this.getAttribute('data-target');

            // Remove active class from all nav items and sections
            navLinks.forEach(item => item.classList.remove('active'));
            dashboardSections.forEach(section => section.classList.remove('active'));

            // Add active class to the clicked nav item and corresponding section
            this.classList.add('active');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }

            // Close the mobile menu if it's open
            if (window.innerWidth < 768 && navLinksContainer.classList.contains('open')) {
                navLinksContainer.classList.remove('open');
                menuBtn.querySelector('i').classList.remove('ri-close-line');
                menuBtn.querySelector('i').classList.add('ri-menu-line');
            }
        });
    });

    // Menu Button Functionality
    menuBtn.addEventListener('click', () => {
        navLinksContainer.classList.toggle('open');
        const menuIcon = menuBtn.querySelector('i');
        if (navLinksContainer.classList.contains('open')) {
            menuIcon.classList.remove('ri-menu-line');
            menuIcon.classList.add('ri-close-line');
        } else {
            menuIcon.classList.remove('ri-close-line');
            menuIcon.classList.add('ri-menu-line');
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navLinksContainer.contains(e.target) && !menuBtn.contains(e.target) && navLinksContainer.classList.contains('open')) {
            navLinksContainer.classList.remove('open');
            const menuIcon = menuBtn.querySelector('i');
            menuIcon.classList.remove('ri-close-line');
            menuIcon.classList.add('ri-menu-line');
        }
    });

    // Close menu when clicking on a nav link (mobile)
    navLinks.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                navLinksContainer.classList.remove('open');
                const menuIcon = menuBtn.querySelector('i');
                menuIcon.classList.remove('ri-close-line');
                menuIcon.classList.add('ri-menu-line');
            }
        });
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            navLinksContainer.classList.remove('open');
            const menuIcon = menuBtn.querySelector('i');
            menuIcon.classList.remove('ri-close-line');
            menuIcon.classList.add('ri-menu-line');
        }
    });

    // --- Progress Circles (Simulated) ---
    const progressCircles = document.querySelectorAll('.progress-circle');
    progressCircles.forEach(circle => {
        const progress = circle.getAttribute('data-progress');
        const circumference = 2 * Math.PI * 40; // radius = 40
        const offset = circumference - (progress / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    });

    // --- Recent Interactions Filter (Basic Simulation) ---
    const filterForm = document.querySelector('.chat-box + form');
    const chatBox = document.querySelector('.chat-box');
    if (filterForm && chatBox) {
        filterForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const filterText = this.querySelector('input[type="text"]').value.toLowerCase();
            const messages = chatBox.querySelectorAll('.msg');

            messages.forEach(msg => {
                const textContent = msg.textContent.toLowerCase();
                if (textContent.includes(filterText)) {
                    msg.style.display = 'flex';
                } else {
                    msg.style.display = 'none';
                }
            });
        });
    }

    // --- Logout ---
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function() {
            window.location.href = "/logout"; // Redirect to Flask logout route
        });
    }

    // --- Profile Dropdown ---
    const profileToggleElementForDropdown = document.getElementById('profile-toggle');
    const profileDropdownMenu = document.getElementById('profile-dropdown-menu');

    if (profileToggleElementForDropdown && profileDropdownMenu) {
        profileToggleElementForDropdown.addEventListener('click', (event) => {
            profileDropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', (event) => {
            if (!profileToggleElementForDropdown.contains(event.target) && !profileDropdownMenu.contains(event.target)) {
                profileDropdownMenu.classList.remove('show');
            }
        });
    }
});

// Update the initializeProgressBars function to handle immediate updates
function initializeProgressBars() {
    const progressBars = document.querySelectorAll('.progress');
    progressBars.forEach(progressBar => {
        const value = progressBar.getAttribute('data-value');
        const fill = progressBar.querySelector('.progress-fill'); 
        
        if (fill && value) {
            // Parse the percentage value
            const percentage = parseFloat(value);

            if (!isNaN(percentage)) {
                // Reset the width to trigger the animation
                fill.style.width = '0%';
                // Force a reflow
                void fill.offsetWidth;
                // Set the new width
                fill.style.width = `${percentage}%`;
            } else {
                // Default to 0 width if the value is invalid
                fill.style.width = '0%';
            }
        }
    });
}

// Update the fetchDashboardData function to reinitialize progress bars
async function fetchDashboardData() {
    try {
        const response = await fetch('/dashboard_data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data || !data.skill_data) {
            throw new Error('Invalid data structure received from server');
        }
        
        updateCharts(data);
        updateStats(data);
        updateNotifications(data);
        initializeProgressBars();
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.textContent = 'Failed to load dashboard data. Please refresh the page.';
        document.querySelector('.dashboard-container').prepend(errorDiv);
    }
}

// Update all charts with new data
function updateCharts(data) {
    try {
        // First destroy all existing charts and clear canvases
        chartManager.destroyAll();
        chartManager.clearAllCanvases();

        // Task Progress Chart
        const taskProgressCanvas = document.getElementById('taskProgressChart');
        if (!taskProgressCanvas) {
            console.error('Task Progress canvas not found');
            return;
        }

        // Get current month and previous 5 months
        const now = new Date();
        const months = [];
        for (let i = 0; i < 6; i++) {
            const date = new Date();
            date.setMonth(now.getMonth() - i);
            months.unshift(date.toLocaleString('default', { month: 'short' }));
        }

        // Prepare data for the chart
        const completedData = new Array(6).fill(0);
        const pendingData = new Array(6).fill(0);
        const overdueData = new Array(6).fill(0);

        // Set current month's data
        const currentMonthIndex = 5; // Last index in the array
        completedData[currentMonthIndex] = data.task_data.completed || 0;
        pendingData[currentMonthIndex] = data.task_data.pending || 0;
        overdueData[currentMonthIndex] = data.task_data.overdue || 0;

        chartManager.charts.taskProgress = new Chart(taskProgressCanvas, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Completed Tasks',
                        data: completedData,
                        borderColor: completedData.some(count => count > 0) ? '#4CAF50' : '#E0E0E0',
                        tension: 0.4,
                        fill: true,
                        backgroundColor: completedData.some(count => count > 0) ? 'rgba(76, 175, 80, 0.1)' : 'rgba(224, 224, 224, 0.1)',
                        hidden: false
                    },
                    {
                        label: 'In Progress Tasks',
                        data: pendingData,
                        borderColor: pendingData.some(count => count > 0) ? '#2196F3' : '#E0E0E0',
                        tension: 0.4,
                        fill: true,
                        backgroundColor: pendingData.some(count => count > 0) ? 'rgba(33, 150, 243, 0.1)' : 'rgba(224, 224, 224, 0.1)',
                        hidden: true
                    },
                    {
                        label: 'Overdue Tasks',
                        data: overdueData,
                        borderColor: overdueData.some(count => count > 0) ? '#F44336' : '#E0E0E0',
                        tension: 0.4,
                        fill: true,
                        backgroundColor: overdueData.some(count => count > 0) ? 'rgba(244, 67, 54, 0.1)' : 'rgba(224, 224, 224, 0.1)',
                        hidden: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#333333'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#333333'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#333333'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });

        // Skill Development Chart
        const skillDevCanvas = document.getElementById('skillProgressChart');
        if (!skillDevCanvas) {
            console.error('Skill Development canvas not found');
            return;
        }

        const skillData = data.skill_data;
        
        if (!skillData) {
            console.error('Skill data is missing');
            return;
        }

        const completed = parseInt(skillData.completed) || 0;
        const inProgress = parseInt(skillData.in_progress) || 0;
        const totalSkills = completed + inProgress;

        try {
            if (chartManager.charts.skillDev) {
                chartManager.charts.skillDev.destroy();
            }

            chartManager.charts.skillDev = new Chart(skillDevCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'In Progress'],
                    datasets: [{
                        data: [completed, inProgress],
                        backgroundColor: [
                            completed > 0 ? '#FF9800' : '#E0E0E0',
                            inProgress > 0 ? '#9C27B0' : '#E0E0E0'
                        ],
                        borderWidth: 1,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                padding: 20,
                                font: {
                                    size: 12
                                },
                                color: '#333333'
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const percentage = totalSkills > 0 ? Math.round((value / totalSkills) * 100) : 0;
                                    return `${context.label}: ${value} (${percentage}%)`;
                                }
                            },
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff'
                        }
                    }
                }
            });

            // Update the skill completion percentage in the stats
            const skillCompletionElements = document.querySelectorAll('.stat-value');
            skillCompletionElements.forEach(element => {
                if (element.textContent.includes('%')) {
                    element.textContent = `${skillData.completion_percentage}%`;
                }
            });

            // Update the skill counts in the dashboard cards
            const skillCountElements = document.querySelectorAll('.card h2');
            skillCountElements.forEach(element => {
                if (element.nextElementSibling && element.nextElementSibling.textContent.includes('Developed Skills')) {
                    element.textContent = completed;
                }
            });

            // Update the skill stats in the skill development section
            const skillStatElements = document.querySelectorAll('.skill-stats .stat-value');
            if (skillStatElements.length >= 2) {
                skillStatElements[0].textContent = completed; // Mastered
                skillStatElements[1].textContent = inProgress; // In Progress
            }

        } catch (chartError) {
            console.error('Error creating skill development chart:', chartError);
        }

        // Network Growth Chart
        const networkGrowthCanvas = document.getElementById('networkGrowthChart');
        if (!networkGrowthCanvas) {
            console.error('Network Growth canvas not found');
            return;
        }

        chartManager.charts.networkGrowth = new Chart(networkGrowthCanvas, {
            type: 'bar',
            data: {
                labels: ['Total Contacts', 'New This Month', 'Meetings', 'Follow-ups'],
                datasets: [{
                    label: 'Network Statistics',
                    data: [
                        data.network_data.total_contacts,
                        data.network_data.new_contacts,
                        data.network_data.meetings_attended,
                        data.network_data.follow_ups
                    ],
                    backgroundColor: [
                        data.network_data.total_contacts > 0 ? '#00BCD4' : '#E0E0E0',
                        data.network_data.new_contacts > 0 ? '#E91E63' : '#E0E0E0',
                        data.network_data.meetings_attended > 0 ? '#8BC34A' : '#E0E0E0',
                        data.network_data.follow_ups > 0 ? '#795548' : '#E0E0E0'
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#333333'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#333333'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error updating charts:', error);
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.textContent = 'Failed to update charts. Please refresh the page.';
        document.querySelector('.dashboard-container').prepend(errorDiv);
    }
}

// Update statistics display
function updateStats(data) {
    // Update task stats
    document.querySelector('.stat-item:nth-child(1) .stat-value').textContent = data.task_data.completed;
    document.querySelector('.stat-item:nth-child(2) .stat-value').textContent = data.task_data.pending;
    document.querySelector('.stat-item:nth-child(3) .stat-value').textContent = data.task_data.overdue;

    // Update progress labels
    document.querySelectorAll('.label')[0].textContent = `${data.task_data.completion_percentage}% completed`;
    document.querySelectorAll('.label')[1].textContent = `${data.skill_data.completion_percentage}% developed`;
    document.querySelectorAll('.label')[2].textContent = `${data.network_data.growth_percentage}% growth`;
    document.querySelectorAll('.label')[3].textContent = `${data.network_data.goal_achievement_percentage}% achieved`;

    // Update progress bars
    const progressBars = document.querySelectorAll('.progress');
    const percentages = [
        data.task_data.completion_percentage,
        data.skill_data.completion_percentage,
        data.network_data.growth_percentage,
        data.network_data.goal_achievement_percentage
    ];

    progressBars.forEach((progressBar, index) => {
        const percentage = percentages[index];
        const progressFill = progressBar.querySelector('.progress-fill');
        
        if (progressFill) {
            // Update data-value attribute
            progressBar.setAttribute('data-value', `${percentage}%`);
            
            // Reset width to 0 to trigger animation
            progressFill.style.width = '0%';
            
            // Force browser reflow
            void progressFill.offsetWidth;
            
            // Set new width with animation
            requestAnimationFrame(() => {
                progressFill.style.width = `${percentage}%`;
            });
        }
    });

    // Update goal stats
    const goalStats = document.querySelectorAll('.goal-stats');
    if (goalStats.length > 0) {
        goalStats[0].textContent = `${data.network_data.completed_goals} of ${data.network_data.total_goals} goals completed`;
    }

    // Update notifications
    updateNotifications(data);
}

function updateNotifications(data) {
    const notificationsContainer = document.querySelector('.notifications');
    if (!notificationsContainer) return;

    // Clear existing notifications
    notificationsContainer.innerHTML = '';

    // Add detailed task notifications
    if (data.task_data.pending_tasks_list && data.task_data.pending_tasks_list.length > 0) {
        data.task_data.pending_tasks_list.forEach(task => {
            let message = '';
            let dueText = task.due_date ? ` (Due: ${task.due_date})` : '';
            if (task.priority && task.priority.toLowerCase() === 'high') {
                message = `⚠️ <b>${task.name}</b>${dueText} — <span style="color:#d32f2f">You have forgotten this high priority task!</span>`;
            } else {
                message = `<b>${task.name}</b>${dueText} — Don't forget to complete this task!`;
            }
            const taskNotification = createNotificationElement(
                'Task Reminder',
                message,
                'task'
            );
            notificationsContainer.appendChild(taskNotification);
        });
    }

    // Add skill notifications
    if (data.skill_data.in_progress_skills_list && data.skill_data.in_progress_skills_list.length > 0) {
        const skillNotification = createNotificationElement(
            'Skills',
            `${data.skill_data.in_progress_skills_list.length} skills in progress`,
            'skill'
        );
        notificationsContainer.appendChild(skillNotification);
    }

    // Add goal notifications
    if (data.network_data.goals && data.network_data.goals.by_type) {
        Object.entries(data.network_data.goals.by_type).forEach(([type, typeData]) => {
            if (typeData.goals && typeData.goals.length > 0) {
                const incompleteGoals = typeData.goals.filter(goal => goal.completed === 0);
                if (incompleteGoals.length > 0) {
                    const goalNotification = createNotificationElement(
                        'Goals',
                        `${incompleteGoals.length} incomplete ${type} goals`,
                        'goal'
                    );
                    notificationsContainer.appendChild(goalNotification);
                }
            }
        });
    }

    // Add meeting notifications
    if (data.network_data.upcoming_meetings && data.network_data.upcoming_meetings.length > 0) {
        const meetingNotification = createNotificationElement(
            'Meetings',
            `${data.network_data.upcoming_meetings.length} upcoming meetings`,
            'meeting'
        );
        notificationsContainer.appendChild(meetingNotification);
    }
}

function createNotificationElement(title, message, type) {
    const div = document.createElement('div');
    div.className = `notification ${type}`;
    div.innerHTML = `
        <i class="ri-${type}-line notification-icon"></i>
        <div class="notification-content">
            <h5>${title}</h5>
            <p>${message}</p>
        </div>
    `;
    return div;
}

// Setup navigation between sections
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.dashboard-section');
    const menuBtn = document.getElementById('menu-btn');
    const navLinks = document.getElementById('nav-links');

    // Handle navigation clicks
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            
            // If clicking dashboard, hide notification popup and reload
            if (target === 'home') {
                // Store current scroll position
                sessionStorage.setItem('scrollPosition', window.scrollY);
                // Set a flag to indicate this is a dashboard refresh
                sessionStorage.setItem('isDashboardRefresh', 'true');
                // Reload the page
                location.reload();
                return;
            }

            // Update active states
            navItems.forEach(navItem => navItem.classList.remove('active'));
            item.classList.add('active');

            // Show target section, hide others
            sections.forEach(section => {
                if (section.id === target) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });

            // Close mobile menu if open
            if (navLinks.classList.contains('show')) {
                navLinks.classList.remove('show');
                menuBtn.classList.remove('active');
            }
        });
    });

    // Restore scroll position after page load
    window.addEventListener('load', function() {
        const scrollPosition = sessionStorage.getItem('scrollPosition');
        if (scrollPosition) {
            window.scrollTo(0, parseInt(scrollPosition));
            sessionStorage.removeItem('scrollPosition');
        }
    });
}

// Setup menu links in content sections
function setupMenuLinks() {
    const menuLinks = document.querySelectorAll('.menu-link a');
    
    menuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            
            // Update active states
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.classList.remove('active');
                if (nav.getAttribute('data-target') === target) {
                    nav.classList.add('active');
                }
            });

            // Show target section
            document.querySelectorAll('.dashboard-section').forEach(section => {
                section.classList.remove('active');
                if (section.id === target) {
                    section.classList.add('active');
                }
            });
        });
    });
}

// Add hover effects to stat items
document.querySelectorAll('.stat-item').forEach(item => {
    item.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
    });
    
    item.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});