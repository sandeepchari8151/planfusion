$(document).ready(function () {
    console.log("To-Do List script is running...");
    fetchTasks();
});

// 📝 Fetch tasks from the database and display them
function fetchTasks() {
    $.ajax({
        url: "/get_tasks",
        method: "GET",
        success: function (response) {
            let todoList = $("#todoList");
            todoList.empty();
            response.tasks.forEach(task => {
                let isCompleted = task.status === "completed";
                let taskClass = isCompleted ? "task-completed" : "task-pending";
                let buttonClass = isCompleted ? "toggle-btn completed" : "toggle-btn pending";
                let taskStatusText = isCompleted ? "✅ Completed" : "❌ Mark as Done";
                
                let listItem = `
                    <li id="task-${task.id}" class="${taskClass}">
                        <span id="task-name-${task.id}">${task.name}</span>
                        <button class="${buttonClass}" onclick="toggleTaskStatus(${task.id}, '${task.status}')">
                            ${taskStatusText}
                        </button>
                        <button class="edit-btn" onclick="editTask(${task.id}, '${task.name}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" onclick="deleteTask(${task.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </li>
                `;
                todoList.append(listItem);
            });
        },
        error: function (xhr, status, error) {
            console.error("Error fetching tasks:", error);
        }
    });
}

// ✅ Toggle task status (Green ✅ or Red ❌)
function toggleTaskStatus(taskId, currentStatus) {
    let newStatus = currentStatus === "completed" ? "pending" : "completed";
    console.log("Toggling Task ID:", taskId, "New Status:", newStatus);

    $.ajax({
        url: `/update_task_status/${taskId}`,
        method: "PUT",
        contentType: "application/json",
        data: JSON.stringify({ status: newStatus }),
        success: function () {
            console.log("Task status updated successfully!");
            fetchTasks(); // Refresh the list
        },
        error: function (xhr, status, error) {
            console.error("Error updating task status:", error);
        }
    });
}

// Toggle task status
function toggleTaskStatus(taskId, currentStatus) {
    let newStatus = currentStatus === "completed" ? "pending" : "completed";

    $.ajax({
        url: `/update_task_status/${taskId}`,
        method: "PUT",
        contentType: "application/json",
        data: JSON.stringify({ status: newStatus }),
        success: function() {
            fetchTasks();
        }
    });
}
// Add a new task
function addTask() {
    let taskName = $("#newTask").val();
    if (taskName.trim() === "") {
        alert("Task cannot be empty");
        return;
    }

    console.log("Adding task:", taskName);
    $.ajax({
        url: "/add_task",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ name: taskName }),
        success: function() {
            console.log("Task added successfully!");
            $("#newTask").val("");
            fetchTasks();
        },
        error: function(xhr, status, error) {
            console.error("Error adding task:", error);
        }
    });
}

// Delete a task
function deleteTask(taskId) {
    console.log("Deleting task ID:", taskId);
    $.ajax({
        url: `/delete_task/${taskId}`,
        method: "DELETE",
        success: function() {
            console.log("Task deleted successfully!");
            fetchTasks();
        },
        error: function(xhr, status, error) {
            console.error("Error deleting task:", error);
        }
    });
}

// Edit a task (Show input field for editing)
function editTask(taskId, oldName) {
    let taskElement = $(`#task-name-${taskId}`);
    
    // Replace text with an input field
    taskElement.html(`
        <input type="text" id="edit-task-${taskId}" value="${oldName}" />
        <button onclick="updateTask(${taskId})"><i class="fas fa-save"></i></button>
    `);
}

// Update a task
function updateTask(taskId) {
    let newName = $(`#edit-task-${taskId}`).val();
    if (newName.trim() === "") {
        alert("Task name cannot be empty!");
        return;
    }

    console.log("Updating task ID:", taskId, "New Name:", newName);
    $.ajax({
        url: "/update_task",
        method: "PUT",
        contentType: "application/json",
        data: JSON.stringify({ id: taskId, name: newName }),
        success: function() {
            console.log("Task updated successfully!");
            fetchTasks();
        },
        error: function(xhr, status, error) {
            console.error("Error updating task:", error);
        }
    });
}
