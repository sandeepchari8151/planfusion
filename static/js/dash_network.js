document.addEventListener("DOMContentLoaded", function () {
    // Common Variables
    const contactList = document.querySelector(".contact-list");
    const contactGrid = document.querySelector(".contact-grid");
    const goalGrid = document.querySelector(".goal-grid");
    const searchInput = document.getElementById("contactSearch");
    const addContactBtn = document.getElementById("addContactBtn");
    const addGoalBtn = document.getElementById("addGoalBtn");
    const addContactForm = document.getElementById("addContactForm");
    const addGoalForm = document.getElementById("addGoalForm");
    const contactForm = document.getElementById("contactForm");
    const goalForm = document.getElementById("goalForm");
    const viewToggle = document.getElementById("nviewToggle");
    const sortToggle = document.getElementById("nsortToggle");
    const currentDateDisplay = document.getElementById("ncurrentDate");

    let contacts = [];
    let goals = [];
    let currentView = 'grid'; // 'grid' or 'list'

    // Initialize date pickers
    flatpickr(".flatpickr-input", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
    });

    // Update current date
    function updateCurrentDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateDisplay.textContent = now.toLocaleDateString(undefined, options);
    }
    updateCurrentDate();

    // Fetch initial data
    async function fetchData() {
        try {
            const [contactsResponse, goalsResponse] = await Promise.all([
                fetch('/api/contacts'),
                fetch('/api/goals')
            ]);

            if (!contactsResponse.ok || !goalsResponse.ok) {
                throw new Error('Failed to fetch data');
            }

            contacts = await contactsResponse.json();
            goals = await goalsResponse.json();

            renderContacts(contacts);
            renderGoals();
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to load network data. Please try again.');
        }
    }

    // Function to hide all forms
    function hideAllForms() {
        document.getElementById('addContactForm').style.display = 'none';
        document.getElementById('addGoalForm').style.display = 'none';
    }

    // Handle add contact button click
    addContactBtn.addEventListener('click', function() {
        hideAllForms();
        document.getElementById('addContactForm').style.display = 'block';
    });

    // Handle add goal button click
    addGoalBtn.addEventListener('click', function() {
        hideAllForms();
        document.getElementById('addGoalForm').style.display = 'block';
    });

    // Handle cancel contact button
    document.getElementById('cancelContact').addEventListener('click', function() {
        hideAllForms();
    });

    // Handle cancel goal button
    document.getElementById('cancelGoal').addEventListener('click', function() {
        hideAllForms();
    });

    // Handle contact form submission
    document.getElementById('contactForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form values
        const name = document.getElementById('contactName').value.trim();
        const email = document.getElementById('contactEmail').value.trim();
        const phone = document.getElementById('contactPhone').value.trim();
        const category = document.getElementById('contactCategory').value;
        const lastInteraction = document.getElementById('lastInteraction').value;
        const notes = document.getElementById('interactionNotes').value.trim();

        // Validate required fields
        if (!name) {
            alert('Name is required');
            return;
        }

        if (!category) {
            alert('Category is required');
            return;
        }

        const formData = {
            name,
            email: email || undefined,
            phone: phone || undefined,
            category,
            lastInteraction: lastInteraction || undefined,
            notes: notes || undefined
        };

        try {
            const response = await fetch('/api/contacts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to add contact: ${response.status}`);
            }

            const newContact = await response.json();
            contacts.push(newContact);
            renderContacts(contacts);
            
            // Reset form and hide modal
            document.getElementById('contactForm').reset();
            hideAllForms();
            
            // Show success message
            alert('Contact added successfully!');

            // Update dashboard network count and progress bars immediately
            try {
                const dashboardResponse = await fetch('/dashboard_data');
                if (dashboardResponse.ok) {
                    const dashboardData = await dashboardResponse.json();
                    
                    // Update network count
                    const networkCountElement = document.querySelector('.card:nth-child(3) .head h2');
                    if (networkCountElement) {
                        networkCountElement.textContent = dashboardData.network_data.total_contacts;
                    }

                    // Update network growth percentage
                    const networkGrowthElement = document.querySelector('.card:nth-child(3) .label');
                    if (networkGrowthElement) {
                        networkGrowthElement.textContent = `${dashboardData.network_data.growth_percentage}% growth`;
                    }

                    // Update network progress bar
                    const networkProgressElement = document.querySelector('.card:nth-child(3) .progress');
                    if (networkProgressElement) {
                        networkProgressElement.setAttribute('data-value', `${dashboardData.network_data.growth_percentage}%`);
                        const progressFill = networkProgressElement.querySelector('.progress-fill');
                        if (progressFill) {
                            progressFill.style.width = `${dashboardData.network_data.growth_percentage}%`;
                        }
                    }

                    // Update network stats
                    const newContactsElement = document.querySelector('.network-stats .stat-item:nth-child(1) .stat-value');
                    if (newContactsElement) {
                        newContactsElement.textContent = dashboardData.network_data.new_contacts;
                    }

                    const upcomingMeetingsElement = document.querySelector('.network-stats .stat-item:nth-child(2) .stat-value');
                    if (upcomingMeetingsElement) {
                        upcomingMeetingsElement.textContent = dashboardData.network_data.follow_ups;
                    }

                    const growthRateElement = document.querySelector('.network-stats .stat-item:nth-child(3) .stat-value');
                    if (growthRateElement) {
                        growthRateElement.textContent = `${dashboardData.network_data.growth_percentage}%`;
                    }
                }
            } catch (error) {
                console.error('Error updating dashboard:', error);
            }
            
        } catch (error) {
            console.error('Error adding contact:', error);
            alert(error.message || 'Failed to add contact. Please try again.');
        }
    });

    // Handle goal form submission
    document.getElementById('goalForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            description: document.getElementById('goalDescription').value,
            type: document.getElementById('goalType').value,
            target: parseInt(document.getElementById('goalTarget').value) || 0,
            deadline: document.getElementById('goalDeadline').value,
            completed: parseInt(document.getElementById('goalCompleted').value) || 0
        };

        // Validate required fields
        if (!formData.description || !formData.type) {
            alert('Please fill in all required fields');
            return;
        }

        // Format deadline if provided
        if (formData.deadline) {
            try {
                const date = new Date(formData.deadline);
                formData.deadline = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            } catch (error) {
                alert('Invalid date format. Please use YYYY-MM-DD');
                return;
            }
        }

        try {
            const response = await fetch('/api/goals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to add goal: ${response.status}`);
            }

            const newGoal = await response.json();
            goals.push(newGoal);
            renderGoals();
            
            // Reset form and hide modal
            document.getElementById('goalForm').reset();
            hideAllForms();
            
            // Show success message
            alert('Goal added successfully!');
            
        } catch (error) {
            console.error('Error adding goal:', error);
            alert(error.message || 'Failed to add goal. Please try again.');
        }
    });

    // Render contacts in the current view
    function renderContacts(contacts) {
        const contactGrid = document.querySelector('.contact-grid');
        const contactList = document.querySelector('.contact-list');
        
        // Clear existing content
        contactGrid.innerHTML = '';
        contactList.innerHTML = '';
        
        if (currentView === 'grid') {
            contactGrid.style.display = 'grid';
            contactList.style.display = 'none';
            renderContactGrid(contacts);
        } else {
            contactGrid.style.display = 'none';
            contactList.style.display = 'block';
            renderContactList(contacts);
        }
    }

    // Render contacts in grid view
    function renderContactGrid(contacts) {
        contactGrid.innerHTML = '';
        contacts.forEach(contact => {
            const contactCard = createContactCard(contact);
            contactGrid.appendChild(contactCard);
        });
    }

    // Render contacts in list view
    function renderContactList(contacts) {
        contactList.innerHTML = '';
        contacts.forEach(contact => {
            const contactItem = createContactListItem(contact);
            contactList.appendChild(contactItem);
        });
    }

    // Create contact card for grid view
    function createContactCard(contact) {
        const card = document.createElement('div');
        card.className = 'contact-card';
        card.dataset.contactId = contact._id;

        const lastInteraction = new Date(contact.lastInteraction);
        const daysSinceInteraction = Math.floor((new Date() - lastInteraction) / (1000 * 60 * 60 * 24));
        const interactionStatus = daysSinceInteraction > 30 ? 'overdue' : daysSinceInteraction > 14 ? 'warning' : 'good';

        card.innerHTML = `
            <div class="contact-header">
                <div class="contact-avatar">
                    <i class="ri-user-fill"></i>
                </div>
                <div class="contact-info">
                    <h3>${contact.name}</h3>
                    <span class="contact-category ${contact.category}">${contact.category}</span>
                </div>
            </div>
            <div class="contact-details">
                <p><i class="ri-mail-line"></i> ${contact.email || 'No email'}</p>
                <p><i class="ri-phone-line"></i> ${contact.phone || 'No phone'}</p>
                <p class="interaction-status ${interactionStatus}">
                    <i class="ri-time-line"></i> Last interaction: ${formatDate(contact.lastInteraction)}
                </p>
            </div>
            <div class="contact-actions">
                <button class="action-btn followup-btn" title="Schedule Follow-up">
                    <i class="ri-calendar-event-line"></i>
                </button>
                <button class="action-btn notes-btn" title="View Notes">
                    <i class="ri-sticky-note-line"></i>
                </button>
                <button class="action-btn edit-btn" title="Edit Contact">
                    <i class="ri-edit-line"></i>
                </button>
                <button class="action-btn delete-btn" title="Delete Contact">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
        `;

        return card;
    }

    // Create contact item for list view
    function createContactListItem(contact) {
        const li = document.createElement('li');
        li.className = 'contact-item';
        li.dataset.contactId = contact._id;

        const lastInteraction = contact.lastInteraction ? new Date(contact.lastInteraction).toLocaleDateString() : 'Never';
        
        li.innerHTML = `
            <div class="contact-main">
                <div class="contact-info">
                    <h4>${contact.name}</h4>
                    <div class="contact-details">
                        <p><i class="ri-mail-line"></i>${contact.email || 'No email'}</p>
                        <p><i class="ri-phone-line"></i>${contact.phone || 'No phone'}</p>
                        <p><i class="ri-time-line"></i>Last interaction: ${lastInteraction}</p>
                    </div>
                </div>
            </div>
            <div class="contact-actions">
                <button class="action-btn edit-contact" title="Edit Contact">
                    <i class="ri-edit-line"></i>
                </button>
                <button class="action-btn delete-contact" title="Delete Contact">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
        `;
        
        return li;
    }

    // Render goals
    function renderGoals() {
        // Remove any existing goal list
        const existingGoalList = document.querySelector('.goal-list');
        if (existingGoalList) {
            existingGoalList.remove();
        }

        goalGrid.innerHTML = '';
        if (currentView === 'grid') {
            goalGrid.style.display = 'grid';
            goals.forEach(goal => {
                const goalCard = createGoalCard(goal);
                goalGrid.appendChild(goalCard);
            });
        } else {
            goalGrid.style.display = 'none';
            const goalList = document.createElement('ul');
            goalList.className = 'goal-list';
            goals.forEach(goal => {
                const goalItem = createGoalListItem(goal);
                goalList.appendChild(goalItem);
            });
            // Insert the goal list after the goal grid
            const goalsSection = document.querySelector('h3');
            if (goalsSection && goalsSection.textContent.includes('Networking Goals')) {
                goalsSection.parentNode.insertBefore(goalList, goalsSection.nextSibling);
            } else {
                // Fallback: insert after the goal grid
                goalGrid.parentNode.insertBefore(goalList, goalGrid.nextSibling);
            }
        }
    }

    // Create goal card
    function createGoalCard(goal) {
        const card = document.createElement('div');
        card.className = 'goal-card';
        card.dataset.goalId = goal._id;

        const progress = (goal.completed / goal.target) * 100;
        const deadline = new Date(goal.deadline);
        const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
        const isComplete = goal.completed >= goal.target;
        const deadlineStatus = isComplete ? 'good' : daysLeft < 0 ? 'overdue' : daysLeft < 7 ? 'warning' : 'good';
        const daysLeftText = isComplete ? 'Completed' : daysLeft < 0 ? 'Overdue' : `${daysLeft} days remaining`;

        card.innerHTML = `
            <div class="goal-header">
                <h3>${goal.description}</h3>
                <span class="goal-type ${goal.type}">${goal.type}</span>
            </div>
            <div class="goal-progress">
                <div class="progress-bar">
                    <div class="progress" style="width: ${progress}%"></div>
                </div>
                <span class="progress-text">${goal.completed}/${goal.target}</span>
            </div>
            <div class="goal-details">
                <p class="deadline ${deadlineStatus}">
                    <i class="ri-timer-line"></i> Deadline: ${formatDate(goal.deadline)}
                </p>
                <p class="days-left">${daysLeftText}</p>
            </div>
            <div class="goal-actions">
                <button class="action-btn update-btn" title="Update Progress">
                    <i class="ri-edit-line"></i>
                </button>
                <button class="action-btn delete-btn" title="Delete Goal">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
        `;

        return card;
    }

    // Create goal list item
    function createGoalListItem(goal) {
        const li = document.createElement('li');
        li.className = 'goal-item';
        li.dataset.goalId = goal._id;

        const progress = (goal.completed / goal.target) * 100;
        const deadline = new Date(goal.deadline);
        const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
        const isComplete = goal.completed >= goal.target;
        const deadlineStatus = isComplete ? 'good' : daysLeft < 0 ? 'overdue' : daysLeft < 7 ? 'warning' : 'good';
        const daysLeftText = isComplete ? 'Completed' : daysLeft < 0 ? 'Overdue' : `${daysLeft} days remaining`;

        li.innerHTML = `
            <div class="goal-main">
                <div class="goal-info">
                    <h4>${goal.description}</h4>
                    <div class="goal-details">
                        <p><i class="ri-target-line"></i>Type: ${goal.type}</p>
                        <p><i class="ri-progress-1-line"></i>Progress: ${goal.completed}/${goal.target}</p>
                        <p><i class="ri-timer-line"></i>Deadline: ${formatDate(goal.deadline)}</p>
                        <p><i class="ri-time-line"></i>Status: ${daysLeftText}</p>
                    </div>
                </div>
            </div>
            <div class="goal-actions">
                <button class="action-btn update-btn" title="Update Progress">
                    <i class="ri-edit-line"></i>
                </button>
                <button class="action-btn delete-btn" title="Delete Goal">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
        `;

        return li;
    }

    // Format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Event Listeners
    viewToggle.addEventListener('click', function() {
        currentView = currentView === 'grid' ? 'list' : 'grid';
        renderContacts(contacts);
        renderGoals();
        this.innerHTML = `<i class="ri-${currentView === 'grid' ? 'grid' : 'list'}-fill"></i> ${currentView === 'grid' ? 'Grid' : 'List'} View`;
    });

    // Handle sort toggle
    document.getElementById('nsortToggle').addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent event from bubbling up
        
        // Remove any existing sort options
        const existingSortOptions = document.querySelectorAll('.sort-options');
        existingSortOptions.forEach(options => options.remove());
        
        const sortOptions = document.createElement('div');
        sortOptions.className = 'sort-options';
        sortOptions.innerHTML = `
            <div class="sort-container">
                <div class="sort-box contacts-box">
                    <h4><i class="ri-user-line"></i> Contacts</h4>
                    <div class="sort-buttons">
                        <button data-sort="name" data-type="contact">
                            <i class="ri-sort-asc"></i> Sort by Name
                        </button>
                        <button data-sort="category" data-type="contact">
                            <i class="ri-folder-line"></i> Sort by Category
                        </button>
                        <button data-sort="interaction" data-type="contact">
                            <i class="ri-time-line"></i> Sort by Last Interaction
                        </button>
                    </div>
                </div>
                <div class="sort-box goals-box">
                    <h4><i class="ri-target-line"></i> Goals</h4>
                    <div class="sort-buttons">
                        <button data-sort="description" data-type="goal">
                            <i class="ri-text"></i> Sort by Description
                        </button>
                        <button data-sort="type" data-type="goal">
                            <i class="ri-folder-line"></i> Sort by Type
                        </button>
                        <button data-sort="deadline" data-type="goal">
                            <i class="ri-calendar-line"></i> Sort by Deadline
                        </button>
                        <button data-sort="progress" data-type="goal">
                            <i class="ri-progress-1-line"></i> Sort by Progress
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add styles for the side-by-side layout
        const style = document.createElement('style');
        style.textContent = `
            .sort-options {
                position: absolute;
                top: calc(100% + 10px);
                right: 0;
                z-index: 1000;
            }
            .sort-container {
                display: flex;
                gap: 30px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 12px;
                min-width: 600px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .sort-box {
                flex: 1;
                min-width: 250px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                padding: 20px;
                transition: transform 0.2s;
            }
            .sort-box:hover {
                transform: translateY(-2px);
            }
            .contacts-box {
                border-right: 2px solid #e9ecef;
            }
            .sort-buttons {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .sort-buttons button {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 16px;
                border: none;
                background: #f8f9fa;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 14px;
                color: #495057;
                width: 100%;
                text-align: left;
            }
            .sort-buttons button:hover {
                background: #e9ecef;
                color: #212529;
            }
            .sort-buttons button i {
                font-size: 16px;
                color: #6c757d;
            }
            .sort-box h4 {
                margin: 0 0 20px 0;
                display: flex;
                align-items: center;
                gap: 10px;
                color: #212529;
                font-size: 16px;
                font-weight: 600;
                padding-bottom: 10px;
                border-bottom: 2px solid #e9ecef;
            }
            .sort-box h4 i {
                color: #6c757d;
                font-size: 18px;
            }
        `;
        document.head.appendChild(style);

        // Add sort options to the parent of the sort button
        this.parentNode.style.position = 'relative'; // Make parent a positioning context
        this.parentNode.appendChild(sortOptions);

        sortOptions.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event from bubbling up
            if (e.target.tagName === 'BUTTON') {
                const sortType = e.target.dataset.type;
                const sortCriteria = e.target.dataset.sort;
                
                if (sortType === 'contact') {
                    sortContacts(sortCriteria);
                } else if (sortType === 'goal') {
                    sortGoals(sortCriteria);
                }
                
                sortOptions.remove();
                style.remove();
            }
        });

        // Close sort options when clicking outside
        document.addEventListener('click', function closeSortOptions(e) {
            if (!e.target.closest('.sort-options') && !e.target.closest('#nsortToggle')) {
                sortOptions.remove();
                style.remove();
                document.removeEventListener('click', closeSortOptions);
            }
        });
    });

    // Sort contacts
    function sortContacts(criteria) {
        contacts.sort((a, b) => {
            switch(criteria) {
                    case 'name':
                    return a.name.localeCompare(b.name);
                    case 'category':
                    return a.category.localeCompare(b.category);
                    case 'interaction':
                    return new Date(b.lastInteraction) - new Date(a.lastInteraction);
                    default:
                    return 0;
            }
        });
        renderContacts(contacts);
    }

    // Sort goals
    function sortGoals(criteria) {
        goals.sort((a, b) => {
            switch(criteria) {
                case 'description':
                    return a.description.localeCompare(b.description);
                case 'type':
                    return a.type.localeCompare(b.type);
                case 'deadline':
                    const dateA = a.deadline ? new Date(a.deadline) : new Date(0);
                    const dateB = b.deadline ? new Date(b.deadline) : new Date(0);
                    return dateA - dateB;
                case 'progress':
                    const progressA = (a.completed / a.target) * 100;
                    const progressB = (b.completed / b.target) * 100;
                    return progressB - progressA;
                default:
                    return 0;
            }
        });
        renderGoals();
    }

    // Search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredContacts = contacts.filter(contact => 
            contact.name.toLowerCase().includes(searchTerm) ||
            contact.category.toLowerCase().includes(searchTerm) ||
            contact.email?.toLowerCase().includes(searchTerm)
        );
        renderFilteredContacts(filteredContacts);
    });

    function renderFilteredContacts(filteredContacts) {
        if (currentView === 'grid') {
            contactGrid.innerHTML = '';
            filteredContacts.forEach(contact => {
                contactGrid.appendChild(createContactCard(contact));
            });
        } else {
            contactList.innerHTML = '';
            filteredContacts.forEach(contact => {
                contactList.appendChild(createContactListItem(contact));
            });
        }
    }

    // Create edit contact form HTML
    function createEditContactForm(contact) {
        return `
            <form id="editContactForm" class="network-form">
                <h3>Edit Contact</h3>
                <div class="form-group">
                    <label for="editContactName">Name</label>
                    <input type="text" id="editContactName" value="${contact.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="editContactEmail">Email</label>
                    <input type="email" id="editContactEmail" value="${contact.email || ''}">
                </div>
                <div class="form-group">
                    <label for="editContactPhone">Phone</label>
                    <input type="tel" id="editContactPhone" value="${contact.phone || ''}">
                </div>
                <div class="form-group">
                    <label for="editContactCategory">Category</label>
                    <select id="editContactCategory" required>
                        <option value="friends" ${contact.category === 'friends' ? 'selected' : ''}>Friends</option>
                        <option value="colleagues" ${contact.category === 'colleagues' ? 'selected' : ''}>Colleagues</option>
                        <option value="mentors" ${contact.category === 'mentors' ? 'selected' : ''}>Mentors</option>
                        <option value="potential" ${contact.category === 'potential' ? 'selected' : ''}>Potential</option>
                        <option value="alumni" ${contact.category === 'alumni' ? 'selected' : ''}>Alumni</option>
                        <option value="other" ${contact.category === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editContactNotes">Notes</label>
                    <textarea id="editContactNotes">${contact.notes || ''}</textarea>
                </div>
                <button type="submit" class="save-btn">Save Changes</button>
                <button type="button" class="cancel-btn">Cancel</button>
            </form>
        `;
    }

    // Create notes view HTML
    function createNotesView(contact) {
        return `
            <div class="notes-view network-form">
                <h3>Contact Notes - ${contact.name}</h3>
                <div class="notes-content">
                    ${contact.notes ? `<p>${contact.notes}</p>` : '<p>No notes available.</p>'}
                </div>
                <div class="form-group">
                    <label for="addNote">Add New Note</label>
                    <textarea id="addNote" placeholder="Enter new note..."></textarea>
                </div>
                <button type="button" class="save-note-btn">Save Note</button>
                <button type="button" class="close-notes-btn">Close</button>
            </div>
        `;
    }

    // Create follow-up scheduler HTML
    function createFollowUpScheduler(contact) {
        const currentDate = new Date().toISOString().split('T')[0];
        return `
            <div class="followup-scheduler network-form">
                <h3>Schedule Follow-up - ${contact.name}</h3>
                <div class="form-group">
                    <label for="followupDate">Follow-up Date</label>
                    <input type="datetime-local" id="followupDate" min="${currentDate}" required>
                </div>
                <div class="form-group">
                    <label for="followupType">Type</label>
                    <select id="followupType" required>
                        <option value="call">Call</option>
                        <option value="meeting">Meeting</option>
                        <option value="email">Email</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="followupNotes">Notes</label>
                    <textarea id="followupNotes" placeholder="Enter any notes for the follow-up..."></textarea>
                </div>
                <button type="button" class="save-followup-btn">Schedule</button>
                <button type="button" class="close-followup-btn">Cancel</button>
            </div>
        `;
    }

    // Update the event listeners
    document.addEventListener('click', async function(e) {
        // Edit contact (both grid and list view)
        if (e.target.closest('.edit-contact, .contact-card .edit-btn')) {
            const contactElement = e.target.closest('.contact-item, .contact-card');
            if (contactElement) {
                const contactId = contactElement.dataset.contactId;
                const contact = contacts.find(c => c._id === contactId);
                if (contact) {
                    // Remove any existing edit forms
                    const existingForms = document.querySelectorAll('.edit-contact-container');
                    existingForms.forEach(form => form.remove());
                    
                    // Create and show edit form
                    const editForm = document.createElement('div');
                    editForm.className = 'edit-contact-container';
                    editForm.innerHTML = createEditContactForm(contact);
                    contactElement.parentNode.insertBefore(editForm, contactElement.nextSibling);
                    
                    // Initialize flatpickr for date inputs if needed
                    flatpickr("#lastInteraction", {
                        enableTime: true,
                        dateFormat: "Y-m-d H:i",
                    });
                    
                    // Add event listener for form submission
                    const form = editForm.querySelector('#editContactForm');
                    form.addEventListener('submit', async function(e) {
                        e.preventDefault();
                        
                        const updatedContact = {
                            name: document.getElementById('editContactName').value,
                            email: document.getElementById('editContactEmail').value,
                            phone: document.getElementById('editContactPhone').value,
                            category: document.getElementById('editContactCategory').value,
                            notes: document.getElementById('editContactNotes').value
                        };
                        
                        try {
                            // First delete the old contact
                            const deleteResponse = await fetch(`/api/contacts/${contactId}`, {
                                method: 'DELETE'
                            });
                            
                            if (!deleteResponse.ok) {
                                throw new Error('Failed to update contact - delete failed');
                            }
                            
                            // Then add the updated contact as a new one
                            const addResponse = await fetch('/api/contacts', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(updatedContact)
                            });
                            
                            if (!addResponse.ok) {
                                throw new Error('Failed to update contact - add failed');
                            }
                            
                            const updatedData = await addResponse.json();
                            // Update contact in the array
                            const index = contacts.findIndex(c => c._id === contactId);
                            if (index !== -1) {
                                contacts[index] = updatedData;
                            }
                            
                            // Re-render contacts
                            renderContacts(contacts);
                            editForm.remove();
                            
                            // Show success message
                            alert('Contact updated successfully!');
                        } catch (error) {
                            console.error('Error updating contact:', error);
                            alert('Failed to update contact. Please try again.');
                        }
                    });
                    
                    // Add event listener for cancel button
                    editForm.querySelector('.cancel-btn').addEventListener('click', function() {
                        editForm.remove();
                    });
                }
            }
        }
        
        // View notes
        if (e.target.closest('.notes-btn')) {
            const contactElement = e.target.closest('.contact-item, .contact-card');
            if (contactElement) {
                const contactId = contactElement.dataset.contactId;
                const contact = contacts.find(c => c._id === contactId);
                if (contact) {
                    // Remove any existing forms
                    const existingForms = document.querySelectorAll('.edit-contact-container, .notes-container, .followup-container');
                    existingForms.forEach(form => form.remove());
                    
                    // Create and show notes view
                    const notesContainer = document.createElement('div');
                    notesContainer.className = 'notes-container';
                    notesContainer.innerHTML = createNotesView(contact);
                    contactElement.parentNode.insertBefore(notesContainer, contactElement.nextSibling);
                    
                    // Add event listener for saving new note
                    notesContainer.querySelector('.save-note-btn').addEventListener('click', async function() {
                        const newNote = document.getElementById('addNote').value.trim();
                        if (newNote) {
                            const currentContact = contacts.find(c => c._id === contactId);
                            const updatedNotes = currentContact.notes ? `${currentContact.notes}\n\n${newNote}` : newNote;
                            
                            try {
                                // First delete the old contact
                                const deleteResponse = await fetch(`/api/contacts/${contactId}`, {
                                    method: 'DELETE'
                                });
                                
                                if (!deleteResponse.ok) {
                                    throw new Error('Failed to update notes - delete failed');
                                }
                                
                                // Then add the updated contact as a new one
                                const addResponse = await fetch('/api/contacts', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        ...currentContact,
                                        notes: updatedNotes,
                                        _id: undefined // Remove _id as it will be generated by the server
                                    })
                                });
                                
                                if (!addResponse.ok) {
                                    throw new Error('Failed to update notes - add failed');
                                }
                                
                                const updatedData = await addResponse.json();
                                // Update contact in the array
                                const index = contacts.findIndex(c => c._id === contactId);
                                if (index !== -1) {
                                    contacts[index] = updatedData;
                                }
                                
                                // Re-render contacts
                                renderContacts(contacts);
                                notesContainer.remove();
                                
                                // Show success message
                                alert('Notes updated successfully!');
                            } catch (error) {
                                console.error('Error updating notes:', error);
                                alert('Failed to update notes. Please try again.');
                            }
                        }
                    });
                    
                    // Add event listener for close button
                    notesContainer.querySelector('.close-notes-btn').addEventListener('click', function() {
                        notesContainer.remove();
                    });
                }
            }
        }
        
        // Schedule follow-up
        if (e.target.closest('.followup-btn')) {
            const contactElement = e.target.closest('.contact-item, .contact-card');
            if (contactElement) {
                const contactId = contactElement.dataset.contactId;
                const contact = contacts.find(c => c._id === contactId);
                if (contact) {
                    // Remove any existing forms
                    const existingForms = document.querySelectorAll('.edit-contact-container, .notes-container, .followup-container');
                    existingForms.forEach(form => form.remove());
                    
                    // Create and show follow-up scheduler
                    const schedulerContainer = document.createElement('div');
                    schedulerContainer.className = 'followup-container';
                    schedulerContainer.innerHTML = createFollowUpScheduler(contact);
                    contactElement.parentNode.insertBefore(schedulerContainer, contactElement.nextSibling);
                    
                    // Initialize flatpickr for date input
                    flatpickr("#followupDate", {
                        enableTime: true,
                        dateFormat: "Y-m-d H:i",
                        minDate: "today"
                    });
                    
                    // Add event listener for scheduling follow-up
                    schedulerContainer.querySelector('.save-followup-btn').addEventListener('click', async function() {
                        const followupDate = document.getElementById('followupDate').value;
                        const followupType = document.getElementById('followupType').value;
                        const followupNotes = document.getElementById('followupNotes').value;
                        
                        if (followupDate) {
                            const currentContact = contacts.find(c => c._id === contactId);
                            
                            try {
                                // First delete the old contact
                                const deleteResponse = await fetch(`/api/contacts/${contactId}`, {
                                    method: 'DELETE'
                                });
                                
                                if (!deleteResponse.ok) {
                                    throw new Error('Failed to schedule follow-up - delete failed');
                                }
                                
                                // Then add the updated contact as a new one
                                const addResponse = await fetch('/api/contacts', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        ...currentContact,
                                        lastInteraction: followupDate,
                                        notes: currentContact.notes ? 
                                            `${currentContact.notes}\n\nFollow-up (${followupType}): ${followupNotes}` : 
                                            `Follow-up (${followupType}): ${followupNotes}`,
                                        _id: undefined // Remove _id as it will be generated by the server
                                    })
                                });
                                
                                if (!addResponse.ok) {
                                    throw new Error('Failed to schedule follow-up - add failed');
                                }
                                
                                const updatedData = await addResponse.json();
                                // Update contact in the array
                                const index = contacts.findIndex(c => c._id === contactId);
                                if (index !== -1) {
                                    contacts[index] = updatedData;
                                }
                                
                                // Re-render contacts
                                renderContacts(contacts);
                                schedulerContainer.remove();
                                
                                // Show success message
                                alert('Follow-up scheduled successfully!');
                            } catch (error) {
                                console.error('Error scheduling follow-up:', error);
                                alert('Failed to schedule follow-up. Please try again.');
                            }
                        } else {
                            alert('Please select a follow-up date.');
                        }
                    });
                    
                    // Add event listener for close button
                    schedulerContainer.querySelector('.close-followup-btn').addEventListener('click', function() {
                        schedulerContainer.remove();
                    });
                }
            }
        }
        
        // Delete contact (both grid and list view)
        if (e.target.closest('.delete-contact, .contact-card .delete-btn')) {
            const contactElement = e.target.closest('.contact-item, .contact-card');
            if (contactElement) {
                const contactId = contactElement.dataset.contactId;
                
                if (confirm('Are you sure you want to delete this contact?')) {
                    try {
                        const response = await fetch(`/api/contacts/${contactId}`, {
                            method: 'DELETE'
                        });
                        
                        if (!response.ok) {
                            throw new Error('Failed to delete contact');
                        }
                        
                        // Remove contact from array and re-render
                        contacts = contacts.filter(contact => contact._id !== contactId);
                        renderContacts(contacts);
                        
                        // Update dashboard network count and progress bars immediately
                        try {
                            const dashboardResponse = await fetch('/dashboard_data');
                            if (dashboardResponse.ok) {
                                const dashboardData = await dashboardResponse.json();
                                
                                // Update network count
                                const networkCountElement = document.querySelector('.card:nth-child(3) .head h2');
                                if (networkCountElement) {
                                    networkCountElement.textContent = dashboardData.network_data.total_contacts;
                                }

                                // Update network growth percentage
                                const networkGrowthElement = document.querySelector('.card:nth-child(3) .label');
                                if (networkGrowthElement) {
                                    networkGrowthElement.textContent = `${dashboardData.network_data.growth_percentage}% growth`;
                                }

                                // Update network progress bar
                                const networkProgressElement = document.querySelector('.card:nth-child(3) .progress');
                                if (networkProgressElement) {
                                    networkProgressElement.setAttribute('data-value', `${dashboardData.network_data.growth_percentage}%`);
                                    const progressFill = networkProgressElement.querySelector('.progress-fill');
                                    if (progressFill) {
                                        progressFill.style.width = `${dashboardData.network_data.growth_percentage}%`;
                                    }
                                }

                                // Update network stats
                                const newContactsElement = document.querySelector('.network-stats .stat-item:nth-child(1) .stat-value');
                                if (newContactsElement) {
                                    newContactsElement.textContent = dashboardData.network_data.new_contacts;
                                }

                                const upcomingMeetingsElement = document.querySelector('.network-stats .stat-item:nth-child(2) .stat-value');
                                if (upcomingMeetingsElement) {
                                    upcomingMeetingsElement.textContent = dashboardData.network_data.follow_ups;
                                }

                                const growthRateElement = document.querySelector('.network-stats .stat-item:nth-child(3) .stat-value');
                                if (growthRateElement) {
                                    growthRateElement.textContent = `${dashboardData.network_data.growth_percentage}%`;
                                }
                            }
                        } catch (error) {
                            console.error('Error updating dashboard:', error);
                        }
                        
                        // Show success message
                        alert('Contact deleted successfully!');
                    } catch (error) {
                        console.error('Error deleting contact:', error);
                        alert('Failed to delete contact. Please try again.');
                    }
                }
            }
        }
        
        // Edit goal (both grid and list view)
        if (e.target.closest('.update-btn, .goal-card .update-btn')) {
            const goalElement = e.target.closest('.goal-item, .goal-card');
            if (goalElement) {
                const goalId = goalElement.dataset.goalId;
                const goal = goals.find(g => g._id === goalId);
                
                if (goal) {
                    // Remove any existing edit forms
                    const existingForms = document.querySelectorAll('.edit-goal-container');
                    existingForms.forEach(form => form.remove());
                    
                    // Create edit form
                    const editForm = document.createElement('div');
                    editForm.className = 'edit-goal-container';
                    editForm.innerHTML = `
                        <form id="editGoalForm" class="network-form">
                            <h3>Edit Goal</h3>
                            <div class="form-group">
                                <label for="editGoalDescription">Goal:</label>
                                <input type="text" id="editGoalDescription" value="${goal.description}" required>
                            </div>
                            <div class="form-group">
                                <label for="editGoalType">Type:</label>
                                <select id="editGoalType">
                                    <option value="events" ${goal.type === 'events' ? 'selected' : ''}>Events</option>
                                    <option value="connections" ${goal.type === 'connections' ? 'selected' : ''}>Connections</option>
                                    <option value="followups" ${goal.type === 'followups' ? 'selected' : ''}>Follow-ups</option>
                                    <option value="meetings" ${goal.type === 'meetings' ? 'selected' : ''}>Meetings</option>
                                    <option value="linkedin_messages" ${goal.type === 'linkedin_messages' ? 'selected' : ''}>LinkedIn</option>
                                    <option value="other" ${goal.type === 'other' ? 'selected' : ''}>Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="editGoalTarget">Target:</label>
                                <input type="number" id="editGoalTarget" value="${goal.target}">
                            </div>
                            <div class="form-group">
                                <label for="editGoalDeadline">Deadline:</label>
                                <input type="text" id="editGoalDeadline" class="flatpickr-input" value="${goal.deadline || ''}">
                            </div>
                            <div class="form-group">
                                <label for="editGoalCompleted">Completed:</label>
                                <input type="number" id="editGoalCompleted" value="${goal.completed}">
                            </div>
                            <button type="submit" class="save-btn">Save Changes</button>
                            <button type="button" class="cancel-btn">Cancel</button>
                        </form>
                    `;

                    // Initialize date picker for the new form
                    flatpickr("#editGoalDeadline", {
                        enableTime: true,
                        dateFormat: "Y-m-d H:i",
                    });

                    // Insert the edit form after the goal element
                    goalElement.parentNode.insertBefore(editForm, goalElement.nextSibling);

                    // Handle cancel button
                    editForm.querySelector('.cancel-btn').addEventListener('click', function() {
                        editForm.remove();
                    });

                    // Handle form submission
                    editForm.querySelector('#editGoalForm').addEventListener('submit', async function(e) {
                        e.preventDefault();
                        
                        const formData = {
                            description: document.getElementById('editGoalDescription').value,
                            type: document.getElementById('editGoalType').value,
                            target: parseInt(document.getElementById('editGoalTarget').value) || 0,
                            deadline: document.getElementById('editGoalDeadline').value ? document.getElementById('editGoalDeadline').value.split(' ')[0] : '',
                            completed: parseInt(document.getElementById('editGoalCompleted').value) || 0
                        };

                        try {
                            const response = await fetch(`/api/goals/${goalId}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(formData)
                            });

                            if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.message || `Failed to update goal: ${response.status}`);
                            }

                            const updatedGoal = await response.json();
                            
                            // Update the goal in the array
                            const index = goals.findIndex(g => g._id === goalId);
                            if (index !== -1) {
                                goals[index] = updatedGoal;
                            }
                            
                            // Re-render goals
                            renderGoals();
                            
                            // Remove edit form
                            editForm.remove();
                            
                            // Show success message
                            alert('Goal updated successfully!');
                            
                        } catch (error) {
                            console.error('Error updating goal:', error);
                            alert(error.message || 'Failed to update goal. Please try again.');
                        }
                    });
                }
            }
        }
        
        // Delete goal (both grid and list view)
        if (e.target.closest('.delete-btn, .goal-card .delete-btn')) {
            const goalElement = e.target.closest('.goal-item, .goal-card');
            if (goalElement) {
                const goalId = goalElement.dataset.goalId;
                
                if (confirm('Are you sure you want to delete this goal?')) {
                    try {
                        const response = await fetch(`/api/goals/${goalId}`, {
                            method: 'DELETE'
                        });
                        
                        if (!response.ok) {
                            throw new Error('Failed to delete goal');
                        }
                        
                        // Remove goal from array and re-render
                        goals = goals.filter(goal => goal._id !== goalId);
                        renderGoals();
                        
                        // Show success message
                        alert('Goal deleted successfully!');
                    } catch (error) {
                        console.error('Error deleting goal:', error);
                        alert('Failed to delete goal. Please try again.');
                    }
                }
            }
        }
    });

    // Initialize
    fetchData();
    });
    