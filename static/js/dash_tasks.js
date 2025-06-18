document.addEventListener("DOMContentLoaded", function () {
    // 🛠️ Common Variables
    const sections = document.querySelectorAll(".dashboard-section");
    const taskInput = document.getElementById("taskInput");
    const taskList = document.getElementById("taskList");
    const navLinks = document.querySelector(".nav_links");
    const addTaskBtn = document.getElementById("addTaskBtn");

    let selectedPriority = "";
    let selectedDueDate = "";
    let selectedReminder = "";
    let completedTasks = 0, remainingTasks = 0;

    // Declare Flatpickr instances in a higher scope
    let dueDatePicker;
    let reminderPicker;

    // Initialize date pickers
    function initializeDatePickers() {
        console.log('Initializing date pickers...');
        
        // Add tooltips to the dropdown buttons
        const priorityButton = document.querySelector('#priorityDropdown');
        const dueDateButton = document.querySelector('#dueDropdown');
        const reminderButton = document.querySelector('#reminderDropdown');

        if (priorityButton) {
            priorityButton.setAttribute('data-tooltip', 'Set task priority level (High, Medium, Low)');
        }
        if (dueDateButton) {
            dueDateButton.setAttribute('data-tooltip', 'Set when the task needs to be completed');
        }
        if (reminderButton) {
            reminderButton.setAttribute('data-tooltip', 'Set a reminder notification for this task');
        }

        // Initialize due date picker
        const dueDateInput = document.querySelector('.due-date-input');
        console.log('Due date input element:', dueDateInput);
        
        if (dueDateInput) {
            dueDatePicker = flatpickr(dueDateInput, {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                minDate: "today",
                inline: false,
                appendTo: document.querySelector('.task-options'),
                onChange: function(selectedDates, dateStr) {
                    console.log('Due date selected:', dateStr);
                    const button = document.querySelector('#dueDropdown');
                    if (button) {
                        button.innerHTML = `<i class="fas fa-calendar"></i> ${dateStr}`;
                        button.classList.add('selected');
                    }
                    selectedDueDate = dateStr;
                }
            });
        }

        // Initialize reminder picker
        const reminderInput = document.querySelector('.reminder-input');
        console.log('Reminder input element:', reminderInput);
        
        if (reminderInput) {
            reminderPicker = flatpickr(reminderInput, {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                minDate: "today",
                inline: false,
                appendTo: document.querySelector('.task-options'),
                onChange: function(selectedDates, dateStr) {
                    console.log('Reminder date selected:', dateStr);
                    const button = document.querySelector('#reminderDropdown');
                    if (button) {
                        button.innerHTML = `<i class="fas fa-bell"></i> ${dateStr}`;
                        button.classList.add('selected');
                    }
                    selectedReminder = dateStr;
                }
            });
        }

        // Add tooltips to priority options
        const priorityOptions = document.querySelectorAll('#priorityDropdown li');
        priorityOptions.forEach(option => {
            if (option.textContent.includes('High')) {
                option.setAttribute('data-tooltip', 'Urgent tasks that need immediate attention');
            } else if (option.textContent.includes('Medium')) {
                option.setAttribute('data-tooltip', 'Important tasks that should be completed soon');
            } else if (option.textContent.includes('Low')) {
                option.setAttribute('data-tooltip', 'Tasks that can be completed when time permits');
            }
        });

        // Add tooltips to due date options
        const dueDateOptions = document.querySelectorAll('#dueDropdown li');
        dueDateOptions.forEach(option => {
            if (option.textContent.includes('Today')) {
                option.setAttribute('data-tooltip', 'Due by the end of today');
            } else if (option.textContent.includes('Tomorrow')) {
                option.setAttribute('data-tooltip', 'Due by the end of tomorrow');
            } else if (option.textContent.includes('Next Week')) {
                option.setAttribute('data-tooltip', 'Due within the next 7 days');
            } else if (option.textContent.includes('Pick a date')) {
                option.setAttribute('data-tooltip', 'Choose a custom due date and time');
            }
        });

        // Add tooltips to reminder options
        const reminderOptions = document.querySelectorAll('#reminderDropdown li');
        reminderOptions.forEach(option => {
            if (option.textContent.includes('Today')) {
                option.setAttribute('data-tooltip', 'Get reminded today');
            } else if (option.textContent.includes('Tomorrow')) {
                option.setAttribute('data-tooltip', 'Get reminded tomorrow');
            } else if (option.textContent.includes('Next Week')) {
                option.setAttribute('data-tooltip', 'Get reminded next week');
            } else if (option.textContent.includes('Pick a date')) {
                option.setAttribute('data-tooltip', 'Choose a custom reminder date and time');
            }
        });
    }

    // Handle date picker selection
    document.querySelectorAll('.dropdown-menu ul li').forEach(item => {
        item.addEventListener('click', function(event) {
            event.stopPropagation();
            const dropdown = this.closest('.dropdown-menu');
            const button = dropdown.closest('.dropdown').querySelector('.dropdown-toggle');
            const iconClass = button.querySelector('i').className;

            if (this.textContent.includes('Pick a date')) {
                console.log('Pick a date clicked for:', dropdown.id);
                if (dropdown.id === 'dueDropdown' && dueDatePicker) {
                    console.log('Opening due date picker');
                    dueDatePicker.open();
                } else if (dropdown.id === 'reminderDropdown' && reminderPicker) {
                    console.log('Opening reminder picker');
                    reminderPicker.open();
                }
                return;
            }

            const selectedText = this.textContent.trim();
            button.innerHTML = `<i class="${iconClass}"></i> <span>${selectedText}</span>`;
            button.classList.add('selected');

            if (dropdown.id === 'dueDropdown') {
                selectedDueDate = selectedText;
            } else if (dropdown.id === 'reminderDropdown') {
                selectedReminder = selectedText;
            }
            dropdown.classList.remove('show');
        });
    });

    // 🛠️ Initialize page
    resetDropdowns();
    updateCurrentDate();
    // Wait for DOM to be fully loaded before initializing date pickers
    setTimeout(initializeDatePickers, 100);
    fetchTasks();

    // Set up task input event listeners
    if (taskInput) {
        taskInput.addEventListener("keypress", function (e) {
            if (e.key === "Enter" && taskInput.value.trim() !== "") {
                handleAddTask();
            }
        });
    }

    if (addTaskBtn) {
        addTaskBtn.addEventListener("click", function() {
            if (taskInput.value.trim() !== "") {
                handleAddTask();
            }
        });
    }

    // 🔹 Sidebar Navigation
    if (navLinks) {
        navLinks.addEventListener("click", function (e) {
            if (e.target.matches(".nav-item")) {
                let target = e.target.getAttribute("data-target");
                const targetSection = document.getElementById(target);

                if (targetSection) {
                    sections.forEach(section => {
                        if (section) section.classList.remove("active");
                    });
                    targetSection.classList.add("active");
                    highlightActiveNavItem(e.target);
                }
            }
        });
    }

    // 🔹 Highlight Active Nav Item
    function highlightActiveNavItem(activeLink) {
        if (!activeLink) return;
        
        const navLinks = document.querySelectorAll(".nav-item");
        navLinks.forEach(link => {
            if (link) link.classList.remove("active");
        });
        activeLink.classList.add("active");
    }

    // 🔹 Dropdown Menu Functionality
    const dropdownToggles = document.querySelectorAll(".dropdown-toggle");
    if (dropdownToggles.length > 0) {
        dropdownToggles.forEach(button => {
            button.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                
                // Close all other dropdowns first
                document.querySelectorAll(".dropdown-menu").forEach(menu => {
                    if (menu.id !== this.getAttribute("data-dropdown")) {
                        menu.classList.remove("show");
                    }
                });

                // Toggle the clicked dropdown
                const dropdownId = this.getAttribute("data-dropdown");
                const dropdownMenu = document.getElementById(dropdownId);
                if (dropdownMenu) {
                    dropdownMenu.classList.toggle("show");
                }
            });
        });
    }

    // Close dropdowns when clicking outside
    document.addEventListener("click", function (event) {
        if (!event.target.closest(".dropdown")) {
            document.querySelectorAll(".dropdown-menu").forEach(menu => {
                menu.classList.remove("show");
            });
        }
    });

    // Prevent dropdown from closing when clicking inside
    document.querySelectorAll(".dropdown-menu").forEach(menu => {
        menu.addEventListener("click", function (event) {
            event.stopPropagation();
        });
    });

    // 🔹 Enhanced Task List Event Handling
    if (taskList) {
        taskList.addEventListener("click", function (event) {
            let target = event.target;
            let taskItem = target.closest(".task-item");

            if (!taskItem) return;

            // Task Checkbox
            if (target.classList.contains("task-checkbox")) {
                const taskId = taskItem.getAttribute('data-task-id');
                const newStatus = target.checked ? 'completed' : 'pending';
                
                // Optimize: Update UI immediately for better responsiveness
                const taskName = taskItem.querySelector('.task-name');
                taskItem.classList.toggle('completed', newStatus === 'completed');
                taskName.classList.toggle('completed', newStatus === 'completed');
                
                // Then update the backend
                updateTask(taskId, { status: newStatus })
                    .catch(error => {
                        console.error('Error updating task:', error);
                        // Revert UI changes if update failed
                        target.checked = !target.checked;
                        taskItem.classList.toggle('completed');
                        taskName.classList.toggle('completed');
                    });
            }

            // Task Delete
            if (target.classList.contains("delete-btn")) {
                const taskId = taskItem.getAttribute('data-task-id');
                if (confirm('Are you sure you want to delete this task?')) {
                    // Optimize: Remove from DOM immediately
                    taskItem.style.opacity = '0';
                    setTimeout(() => taskItem.remove(), 300);
                    
                    deleteTask(taskId)
                        .catch(error => {
                            console.error('Error deleting task:', error);
                            // Revert UI changes if delete failed
                            taskItem.style.opacity = '1';
                        });
                }
            }
        });
    }

    // 🔹 Update Task Counts - Consolidated function
    function updateTaskCounts() {
        const totalTasks = document.querySelectorAll('.task-item').length;
        const completedTasks = document.querySelectorAll('.task-checkbox:checked').length;
        const pendingTasks = totalTasks - completedTasks;

        // Update task counts in the task list section
        const totalElement = document.querySelector('.total-tasks');
        const completedElement = document.querySelector('.completed-tasks');
        const pendingElement = document.querySelector('.pending-tasks');

        if (totalElement) totalElement.textContent = totalTasks;
        if (completedElement) completedElement.textContent = completedTasks;
        if (pendingElement) pendingElement.textContent = pendingTasks;

        // Update counts in the task header
        const completedCount = document.getElementById("completedTasksCount");
        const remainingCount = document.getElementById("remainingTasksCount");
        
        if (completedCount) completedCount.textContent = completedTasks;
        if (remainingCount) remainingCount.textContent = pendingTasks;
    }

    // 🔹 Reset Dropdowns
    function resetDropdowns() {
        selectedPriority = "";
        selectedDueDate = "";
        selectedReminder = "";

        document.querySelectorAll(".dropdown-toggle").forEach(button => {
            const iconClass = button.querySelector("i").className;
            button.innerHTML = `<i class="${iconClass}"></i>`;
            button.classList.remove("selected");
        });
    }

    // 🔹 Format Date/Time
    function formatDateTime(dateTime) {
        const dateObj = new Date(dateTime);
        if (isNaN(dateObj)) return "Invalid Date";
        return dateObj.toLocaleString();
    }

    function switchTaskCategory(selectedCategory) {
        const taskHeader = document.querySelector(".todo-header h2");

        taskHeader.innerHTML = `<i class="ri-${getIcon(selectedCategory)}"></i> ${selectedCategory}`;
    }

    function getIcon(category) {
        switch (category) {
            case "My Day": return "sun-line";
            case "Important": return "star-line";
            case "Planned": return "calendar-line";
            case "Assigned to me": return "user-line";
            case "Tasks": return "checkbox-line";
            default: return "checkbox-line";
        }
    }

    // Function to fetch tasks from the backend
    async function fetchTasks() {
        try {
            const response = await fetch('/api/dashboard/tasks');
            if (!response.ok) {
                throw new Error('Failed to fetch tasks');
            }
            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            showNotification('Error loading tasks', 'error');
        }
    }

    // Function to add a new task
    async function addNewTask(taskData) {
        try {
            const response = await fetch('/api/dashboard/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData)
            });

            if (!response.ok) {
                throw new Error('Failed to add task');
            }

            const newTask = await response.json();
            renderTasks([newTask], true); // true indicates append mode
            return newTask;
        } catch (error) {
            console.error('Error adding task:', error);
            showNotification('Error adding task', 'error');
            return null;
        }
    }

    // Function to update a task
    async function updateTask(taskId, updateData) {
        try {
            const response = await fetch(`/api/dashboard/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error('Failed to update task');
            }

            const updatedTask = await response.json();
            
            // Optimize: Only update the specific task element instead of re-rendering
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                const taskName = taskElement.querySelector('.task-name');
                const completeBtn = taskElement.querySelector('.complete-task-btn');
                
                // Update task status classes
                taskElement.classList.toggle('completed', updateData.status === 'completed');
                taskName.classList.toggle('completed', updateData.status === 'completed');
                completeBtn.classList.toggle('completed', updateData.status === 'completed');
                
                // Update button text and icon
                completeBtn.innerHTML = `
                    <i class="fas ${updateData.status === 'completed' ? 'fa-undo' : 'fa-check'}"></i>
                    ${updateData.status === 'completed' ? 'Undo' : 'Complete'}
                `;
                
                // Update task counts locally
                updateTaskCounts();
                
                // Debounce the dashboard update
                debouncedUpdateTaskProgressBar();
            }
            
            return updatedTask;
        } catch (error) {
            console.error('Error updating task:', error);
            showNotification('Error updating task', 'error');
            return null;
        }
    }

    // Add debounce function for dashboard updates
    let debounceTimer;
    function debouncedUpdateTaskProgressBar() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            updateTaskProgressBar();
        }, 500); // Wait 500ms before updating dashboard
    }

    // Function to delete a task
    async function deleteTask(taskId) {
        try {
            const response = await fetch(`/api/dashboard/tasks/${taskId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete task');
            }

            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                taskElement.remove();
                updateTaskCounts();
            }
            showNotification('Task deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting task:', error);
            showNotification('Error deleting task', 'error');
        }
    }

    // Function to render tasks
    function renderTasks(tasks, append = false, update = false) {
        const taskList = document.querySelector('.task-list');
        if (!taskList) return;

        if (!append && !update) {
            taskList.innerHTML = '';
        }

        tasks.forEach(task => {
            if (update) {
                const existingTask = document.querySelector(`[data-task-id="${task._id}"]`);
                if (existingTask) {
                    existingTask.replaceWith(createTaskElement(task));
                }
            } else {
                taskList.appendChild(createTaskElement(task));
            }
        });

        updateTaskCounts();
    }

    // Function to create task element
    function createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        taskElement.setAttribute('data-task-id', task._id);
        // Remove all priority/completed classes first
        taskElement.classList.remove('priority-high', 'priority-medium', 'priority-low', 'completed');
        const normalizedPriority = (task.priority || 'low').toLowerCase().trim();
        if (task.status === 'completed') {
            taskElement.classList.add('completed');
        } else if (normalizedPriority === 'high') {
            taskElement.classList.add('priority-high');
        } else if (normalizedPriority === 'medium') {
            taskElement.classList.add('priority-medium');
        } else {
            taskElement.classList.add('priority-low');
        }

        const taskContent = `
            <div class="task-content">
                <span class="task-name ${task.status === 'completed' ? 'completed' : ''}" title="${task.description || task.name}">${task.name}</span>
            </div>
            <div class="task-meta">
                ${task.priority ? `<span class="task-priority ${normalizedPriority}">${task.priority}</span>` : ''}
                ${task.due_date ? `<span class="task-due-date"><i class="fas fa-calendar"></i> ${task.due_date}</span>` : ''}
                ${task.reminder ? `<span class="task-reminder"><i class="fas fa-bell"></i> ${task.reminder}</span>` : ''}
            </div>
            <div class="task-actions">
                <button class="complete-task-btn ${task.status === 'completed' ? 'completed' : ''}" title="${task.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}">
                    <i class="fas ${task.status === 'completed' ? 'fa-undo' : 'fa-check'}"></i>
                    ${task.status === 'completed' ? 'Undo' : 'Complete'}
                </button>
                <button class="edit-task-btn" title="Edit task">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
                <button class="delete-task-btn" title="Delete task">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            </div>
        `;

        taskElement.innerHTML = taskContent;

        // Add event listeners
        const completeBtn = taskElement.querySelector('.complete-task-btn');
        const taskName = taskElement.querySelector('.task-name');
        
        completeBtn.addEventListener('click', () => {
            const newStatus = task.status === 'completed' ? 'pending' : 'completed';
            updateTask(task._id, { status: newStatus })
                .then(() => {
                    task.status = newStatus;
                    taskName.classList.toggle('completed', newStatus === 'completed');
                    completeBtn.classList.toggle('completed', newStatus === 'completed');
                    completeBtn.innerHTML = `
                        <i class="fas ${newStatus === 'completed' ? 'fa-undo' : 'fa-check'}"></i>
                        ${newStatus === 'completed' ? 'Undo' : 'Complete'}
                    `;
                    taskElement.classList.remove('priority-high', 'priority-medium', 'priority-low', 'completed');
                    const normalizedPriority = (task.priority || 'low').toLowerCase().trim();
                    if (newStatus === 'completed') {
                        taskElement.classList.add('completed');
                    } else if (normalizedPriority === 'high') {
                        taskElement.classList.add('priority-high');
                    } else if (normalizedPriority === 'medium') {
                        taskElement.classList.add('priority-medium');
                    } else {
                        taskElement.classList.add('priority-low');
                    }
                    updateTaskCounts();
                    updateTaskProgressBar();
                })
                .catch(error => {
                    console.error('Error updating task status:', error);
                    showNotification('Error updating task status', 'error');
                });
        });

        const deleteBtn = taskElement.querySelector('.delete-task-btn');
        deleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this task?')) {
                deleteTask(task._id);
            }
        });

        const editBtn = taskElement.querySelector('.edit-task-btn');
        editBtn.addEventListener('click', () => {
            showEditModal(task);
        });

        return taskElement;
    }

    // Function to show edit modal
    function showEditModal(task) {
        // Create modal if it doesn't exist
        let modal = document.querySelector('.task-edit-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'task-edit-modal';
            modal.innerHTML = `
                <div class="task-edit-content">
                    <div class="task-edit-header">
                        <h3>Edit Task</h3>
                        <button class="close-modal-btn">&times;</button>
                    </div>
                    <form class="task-edit-form">
                        <div class="form-group">
                            <label for="editTaskName">Task Name</label>
                            <input type="text" id="editTaskName" required>
                        </div>
                        <div class="form-group">
                            <label for="editTaskPriority">Priority</label>
                            <select id="editTaskPriority">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="editTaskDueDate">Due Date</label>
                            <input type="text" id="editTaskDueDate" class="flatpickr-input" placeholder="Select due date">
                        </div>
                        <div class="form-group">
                            <label for="editTaskReminder">Reminder</label>
                            <input type="text" id="editTaskReminder" class="flatpickr-input" placeholder="Select reminder date">
                        </div>
                        <div class="task-edit-actions">
                            <button type="button" class="cancel-edit-btn">Cancel</button>
                            <button type="submit" class="save-edit-btn">Save Changes</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);

            // Initialize Flatpickr for date inputs
            flatpickr("#editTaskDueDate", {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                time_24hr: true,
                allowInput: true,
                placeholder: "Select due date"
            });

            flatpickr("#editTaskReminder", {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                time_24hr: true,
                allowInput: true,
                placeholder: "Select reminder date"
            });

            // Add event listeners for modal
            const closeBtn = modal.querySelector('.close-modal-btn');
            const cancelBtn = modal.querySelector('.cancel-edit-btn');
            const form = modal.querySelector('.task-edit-form');

            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });

            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const updatedTask = {
                    name: document.getElementById('editTaskName')?.value || '',
                    priority: document.getElementById('editTaskPriority')?.value || 'low',
                    due_date: document.getElementById('editTaskDueDate')?.value || '',
                    reminder: document.getElementById('editTaskReminder')?.value || '',
                    notes: document.getElementById('editTaskNotes')?.value || ''
                };

                try {
                    await updateTask(task._id, updatedTask);
                    modal.classList.remove('active');
                    showNotification('Task updated successfully', 'success');
                    await fetchTasks(); // Refresh the task list
                } catch (error) {
                    console.error('Error updating task:', error);
                    showNotification('Error updating task', 'error');
                }
            });
        }

        // Populate form with current task data
        document.getElementById('editTaskName').value = task.name;
        document.getElementById('editTaskPriority').value = task.priority || 'low';
        document.getElementById('editTaskDueDate').value = task.due_date || '';
        document.getElementById('editTaskReminder').value = task.reminder || '';

        // Show modal
        modal.classList.add('active');
    }

    // Function to show notifications
    function showNotification(message, type = 'info') {
        // Implement your notification system here
        console.log(`${type}: ${message}`);
    }

    // Function to update current date
    function updateCurrentDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const currentDateDisplay = document.querySelector('.tasks-header p');
        if (currentDateDisplay) {
            currentDateDisplay.textContent = now.toLocaleDateString(undefined, options);
        }
    }

    // Function to handle adding a new task
    async function handleAddTask() {
        const taskText = taskInput.value.trim();
        if (!taskText) return;

        const taskData = {
            name: taskText,
            status: 'pending'
        };

        // Add optional fields if they are selected
        if (selectedPriority) {
            taskData.priority = selectedPriority;
        }
        if (selectedDueDate) {
            taskData.due_date = selectedDueDate;
        }
        if (selectedReminder) {
            taskData.reminder = selectedReminder;
        }

        const newTask = await addNewTask(taskData);
        if (newTask) {
            taskInput.value = '';
            resetDropdowns();
            showNotification('Task added successfully', 'success');
            await fetchTasks(); // Refresh the task list
        }
    }

    // Function to update task progress in dashboard
    async function updateTaskProgressBar() {
        try {
            const response = await fetch('/dashboard_data');
            if (!response.ok) {
                throw new Error('Failed to fetch dashboard data');
            }
            const data = await response.json();
            
            // Update task stats
            const statValues = document.querySelectorAll('.stat-value');
            if (statValues.length >= 3) {
                statValues[0].textContent = data.task_data.completed; // Completed
                statValues[1].textContent = data.task_data.pending; // Pending
                statValues[2].textContent = data.task_data.overdue; // Overdue
            }

            // Update progress circles
            const progressCircles = document.querySelectorAll('.progress');
            progressCircles.forEach(circle => {
                if (circle.nextElementSibling && circle.nextElementSibling.textContent.includes('completed')) {
                    circle.style.background = `conic-gradient(#8a2be2 ${data.task_data.completion_percentage}%, #ddd ${data.task_data.completion_percentage}%)`;
                    circle.nextElementSibling.textContent = `${data.task_data.completion_percentage}% completed`;
                }
            });

            // Update task count in the dashboard card
            const taskCountElements = document.querySelectorAll('.card h2');
            taskCountElements.forEach(element => {
                if (element.nextElementSibling && element.nextElementSibling.textContent.includes('Tasks')) {
                    element.textContent = data.task_data.completed;
                }
            });
        } catch (error) {
            console.error('Error updating dashboard progress:', error);
        }
    }

    // Grid/List View Toggle for Tasks
    const viewToggleBtn = document.getElementById('viewToggle');
    if (viewToggleBtn && taskList) {
        let isGrid = false;
        viewToggleBtn.addEventListener('click', function() {
            isGrid = !isGrid;
            if (isGrid) {
                taskList.classList.add('grid-view');
                taskList.classList.remove('list-view');
                viewToggleBtn.innerHTML = '<i class="ri-list-check"></i> List View';
            } else {
                taskList.classList.remove('grid-view');
                taskList.classList.add('list-view');
                viewToggleBtn.innerHTML = '<i class="ri-grid-fill"></i> Grid View';
            }
        });
        // Set initial state
        taskList.classList.add('list-view');
    }

    // Sort functionality
    const sortToggleBtn = document.getElementById('sortToggle');
    if (sortToggleBtn) {
        sortToggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const existingOptions = document.querySelector('.sort-options');
            if (existingOptions) {
                existingOptions.remove();
                return;
            }

            const sortOptions = document.createElement('div');
            sortOptions.className = 'sort-options';
            sortOptions.innerHTML = `
                <button data-sort="name">
                    <i class="ri-text"></i>
                    Sort by Name
                </button>
                <button data-sort="priority">
                    <i class="ri-flag-line"></i>
                    Sort by Priority
                </button>
                <button data-sort="due_date">
                    <i class="ri-calendar-line"></i>
                    Sort by Due Date
                </button>
                <button data-sort="status">
                    <i class="ri-checkbox-circle-line"></i>
                    Sort by Status
                </button>
                <button data-sort="category">
                    <i class="ri-folder-line"></i>
                    Sort by Category
                </button>
            `;
            this.parentNode.appendChild(sortOptions);

            sortOptions.addEventListener('click', function(e) {
                if (e.target.tagName === 'BUTTON') {
                    sortTasks(e.target.dataset.sort);
                    sortOptions.remove();
                }
            });

            // Remove sort options when clicking outside
            document.addEventListener('click', function removeSortOptions(e) {
                if (!e.target.closest('.sort-options') && !e.target.closest('#sortToggle')) {
                    sortOptions.remove();
                    document.removeEventListener('click', removeSortOptions);
                }
            });
        });
    }

    function sortTasks(criteria) {
        const taskList = document.querySelector('.task-list');
        const tasks = Array.from(taskList.children);
        
        tasks.sort((a, b) => {
            switch(criteria) {
                case 'name':
                    return a.querySelector('.task-name').textContent.localeCompare(
                        b.querySelector('.task-name').textContent
                    );
                case 'priority':
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    const aPriority = a.dataset.priority || 'low';
                    const bPriority = b.dataset.priority || 'low';
                    return priorityOrder[aPriority] - priorityOrder[bPriority];
                case 'due_date':
                    const aDate = a.dataset.dueDate ? new Date(a.dataset.dueDate) : new Date(8640000000000000);
                    const bDate = b.dataset.dueDate ? new Date(b.dataset.dueDate) : new Date(8640000000000000);
                    return aDate - bDate;
                case 'status':
                    const aCompleted = a.classList.contains('completed');
                    const bCompleted = b.classList.contains('completed');
                    return aCompleted === bCompleted ? 0 : aCompleted ? 1 : -1;
                case 'category':
                    return (a.dataset.category || '').localeCompare(b.dataset.category || '');
                default:
                    return 0;
            }
        });

        tasks.forEach(task => taskList.appendChild(task));
    }
});