document.addEventListener("DOMContentLoaded", async function () {
    const skillInput = document.getElementById("newSkill");
    const learningSourceInput = document.getElementById("learningSource");
    const startDateInput = document.getElementById("startDate");
    const expectedEndDateInput = document.getElementById("expectedEndDate");
    const skillList = document.getElementById("skillList");
    const addSkillButton = document.getElementById("addSkill");
    const cancelAddButton = document.getElementById("cancelAdd");
    const viewToggle = document.getElementById("sviewToggle");
    const sortToggle = document.getElementById("ssortToggle");
    const additionalInputs = document.querySelector(".additional-inputs");
    const initialInput = document.querySelector(".initial-input");
    const skillSuggestionsContainer = document.getElementById("skillSuggestions");
    const currentDateDisplay = document.getElementById("scurrentDate");

    const certificateModal = document.getElementById("certificateModal");
    const notesModal = document.getElementById("notesModal");
    const documentsModal = document.getElementById("documentsModal");
    const closeCertificateModal = certificateModal ? certificateModal.querySelector(".close-button") : null;
    const closeNotesModal = notesModal ? notesModal.querySelector(".close-button") : null;
    const closeDocumentsModal = documentsModal ? documentsModal.querySelector(".close-button") : null;
    const certificateURLInput = document.getElementById("certificateURL");
    const saveCertificateButton = document.getElementById("saveCertificate");
    const certificateSkillNameDisplay = document.getElementById("certificateSkillName");
    const notesSkillNameDisplay = document.getElementById("notesSkillName");
    const notesList = document.getElementById("notesList");
    const newNoteInput = document.getElementById("newNote");
    const saveNoteButton = document.getElementById("saveNoteButton");
    const documentsSkillNameDisplay = document.getElementById("documentsSkillName");
    const documentsList = document.getElementById("documentsList");
    const newDocumentURLInput = document.getElementById("newDocumentURL");
    const addDocumentButton = document.getElementById("addDocumentButton");
    const completionCertificateURLInput = document.getElementById("completionCertificateURL");
    const saveCertificateURLButton = document.getElementById("saveCertificateURLButton");
    const certificateDisplay = document.getElementById("certificateDisplay");
    const certificateLinkDisplay = document.getElementById("certificateLink");
    const uploadNewDocumentInput = document.getElementById("uploadNewDocument");
    const uploadDocumentButton = document.getElementById("uploadDocumentButton");
    const uploadCertificateButton = document.getElementById("uploadCertificateButton");

    let showAdditionalInputs = false;
    const recommendedSkills = ["Python", "JavaScript", "HTML", "CSS", "React", "Node.js", "Java", "C++", "SQL", "Data Analysis"];
    const recommendedSources = ["Coursera", "Udemy", "edX", "Pluralsight", "LinkedIn Learning", "Codecademy", "FreeCodeCamp", "YouTube"];
    let skillsData = [];
    let currentSkillIdForNotes = null;
    let currentSkillIdForDocuments = null;
    let currentSkillIdForCertificate = null;

    // Add notification function at the top of the file after document.addEventListener
    function showNotification(message, type = 'success') {
        // Remove any existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="ri-${type === 'success' ? 'check-line' : 'error-warning-line'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles inline to ensure they're applied
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 1000;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
        `;

        notification.querySelector('.notification-content').style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
        `;

        // Add to document
        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Set up certificate upload button event listener
    if (uploadCertificateButton) {
        uploadCertificateButton.addEventListener("click", async function() {
            const certificateFile = document.getElementById("certificateFile");
            if (!certificateFile || !certificateFile.files[0]) {
                showNotification("Please select a certificate file to upload", "error");
                return;
            }

            const formData = new FormData();
            formData.append("certificate", certificateFile.files[0]);
            formData.append("skillId", currentSkillIdForDocuments);

            try {
                const response = await fetch("/api/upload_certificate", {
                    method: "POST",
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                showNotification("Certificate uploaded successfully!");
                
                // Update notification count immediately
                const notificationCount = document.getElementById('notificationCount');
                if (notificationCount) {
                    const currentCount = parseInt(notificationCount.textContent || '0');
                    notificationCount.textContent = currentCount + 1;
                }
                
                // Refresh the skills list to show the updated certificate
                await fetchSkills();
                renderSkills();
                
                // Update the certificate display in the documents modal
                const skill = findSkillObject(currentSkillIdForDocuments);
                if (skill) {
                    showDocumentsModal(skill);
                }
            } catch (error) {
                console.error("Error uploading certificate:", error);
                showNotification("Could not upload certificate. Please try again. Error: " + error.message, "error");
            }
        });
    }

    // --- Platform Links for Learning Source ---
    const learningPlatforms = {
      "Infosys Spring": {
        url: "https://infyspringboard.onwingspan.com/web/en/catalog/courses",
        supportsSearch: false
      },
      "Coursera": {
        url: "https://www.coursera.org/search?query=",
        supportsSearch: true
      },
      "Udemy": {
        url: "https://www.udemy.com/courses/search/?q=",
        supportsSearch: true
      },
      "edX": {
        url: "https://www.edx.org/search?q=",
        supportsSearch: true
      },
      "Pluralsight": {
        url: "https://www.pluralsight.com/search?q=",
        supportsSearch: true
      },
      "LinkedIn Learning": {
        url: "https://www.linkedin.com/learning/search?keywords=",
        supportsSearch: true
      },
      "Codecademy": {
        url: "https://www.codecademy.com/catalog/all?query=",
        supportsSearch: true
      },
      "FreeCodeCamp": {
        url: "https://www.freecodecamp.org/learn/",
        supportsSearch: false
      },
      "YouTube": {
        url: "https://www.youtube.com/results?search_query=",
        supportsSearch: true
      }
    };

    // Create or select a container for the link
    let platformLink = document.getElementById("platformLink");
    if (!platformLink) {
      platformLink = document.createElement("a");
      platformLink.id = "platformLink";
      platformLink.target = "_blank";
      platformLink.style.display = "none";
      platformLink.style.marginTop = "6px";
      platformLink.style.color = "#8a2be2";
      learningSourceInput.parentNode.appendChild(platformLink);
    }

    function updatePlatformLink() {
      const platform = learningSourceInput.value.trim();
      const skill = skillInput.value.trim();
      if (learningPlatforms[platform]) {
        let url = learningPlatforms[platform].url;
        if (learningPlatforms[platform].supportsSearch && skill) {
          url += encodeURIComponent(skill);
        }
        platformLink.href = url;
        platformLink.textContent = learningPlatforms[platform].supportsSearch && skill
          ? `Search "${platform}" for "${skill}"`
          : `Go to ${platform} catalog`;
        platformLink.style.display = "inline-block";
      } else {
        platformLink.style.display = "none";
      }
    }

    learningSourceInput.addEventListener("input", updatePlatformLink);
    skillInput.addEventListener("input", updatePlatformLink);

    // --- Helper Functions ---

    // Display current date
    function updateCurrentDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateDisplay.textContent = now.toLocaleDateString(undefined, options);
    }
    updateCurrentDate();

    // Initialize Flatpickr
    flatpickr(".flatpickr", {
        dateFormat: "Y-m-d",
        enableTime: false
    });

    // Function to display suggestions
    function displaySuggestions(suggestions) {
        skillSuggestionsContainer.innerHTML = "";
        if (suggestions.length > 0 && skillInput === document.activeElement) {
            suggestions.forEach(skill => {
                const suggestionItem = document.createElement("div");
                suggestionItem.classList.add("suggestion-item");
                suggestionItem.textContent = skill;
                suggestionItem.addEventListener("click", function () {
                    skillInput.value = skill;
                    skillSuggestionsContainer.classList.remove("show");
                });
                skillSuggestionsContainer.appendChild(suggestionItem);
            });
            skillSuggestionsContainer.classList.add("show");
        } else {
            skillSuggestionsContainer.classList.remove("show");
        }
    }

    // Function to display source suggestions
    function displaySourceSuggestions(suggestions) {
        const sourceSuggestionsContainer = document.getElementById("sourceSuggestions");
        sourceSuggestionsContainer.innerHTML = "";
        if (suggestions.length > 0) {
            suggestions.forEach(source => {
                const suggestionItem = document.createElement("div");
                suggestionItem.classList.add("suggestion-item");
                suggestionItem.textContent = source;
                suggestionItem.addEventListener("click", function() {
                    document.getElementById("learningSource").value = source;
                    sourceSuggestionsContainer.classList.remove("show");
                });
                sourceSuggestionsContainer.appendChild(suggestionItem);
            });
            sourceSuggestionsContainer.classList.add("show");
        } else {
            sourceSuggestionsContainer.classList.remove("show");
        }
    }

    // Function to fetch skills from the API
    async function fetchSkills() {
        try {
            const response = await fetch('/api/skills');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error('Invalid response format: expected array of skills');
            }
            skillsData = data;
            renderSkills();
            return data; // Return the data for potential use
        } catch (error) {
            console.error('Error fetching skills:', error);
            alert('Could not load skills. Please try again.');
            return []; // Return empty array in case of error
        }
    }

    // Function to find a skill object by its ID
    function findSkillObject(id) {
        if (!id) {
            console.error('Invalid skill ID provided');
            return null;
        }
        const skill = skillsData.find(skill => skill._id === id);
        if (!skill) {
            console.error(`Could not find skill object for ID: ${id}`);
            // Try to refresh the skills data
            fetchSkills().catch(error => {
                console.error('Error refreshing skills data:', error);
            });
        }
        return skill;
    }

    // Function to find a skill list item element by its ID
    function findSkillItem(id) {
        return skillList.querySelector(`[data-skill-id="${id}"]`);
    }

    // Function to update the display of a skill item
    function updateSkillDisplay(item, skill) {
        if (item) {
            const progressBar = item.querySelector(".progress-bar");
            const remainingElement = item.querySelector(".remaining-days");
            if (progressBar) {
                progressBar.style.width = `${skill.completed}%`;
            }
            if (remainingElement) {
                const endDate = new Date(skill.expectedEndDate);
                const today = new Date();
                const timeLeft = endDate.getTime() > today.getTime() ? Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)) : 0;
                remainingElement.textContent = `Remaining: ${timeLeft} days`;
            }
            item.className = `skill-item ${skill.completed === 100 ? 'completed' : ''}`; // Update the class for color change
        } else {
            console.error("Error: Skill item not found for update display.");
        }
    }

    // Function to create a skill list item element
    function createSkillElement(skill) {
        const li = document.createElement("li");
        li.classList.add("skill-item");
        if (skill.completed === 100) {
            li.classList.add("completed");
        }
        li.dataset.skillId = skill._id;
        li.dataset.priority = skill.priority || 'medium';
        li.dataset.level = skill.level || 'beginner';
        
        const endDate = new Date(skill.expectedEndDate);
        const today = new Date();
        const timeLeft = endDate.getTime() > today.getTime() ? Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)) : 0;
        
        const progressPercentage = skill.completed || 0;
        const progressClass = progressPercentage === 100 ? 'completed' : 
                            progressPercentage >= 75 ? 'high' :
                            progressPercentage >= 50 ? 'medium' :
                            progressPercentage >= 25 ? 'low' : 'very-low';

        li.innerHTML = `
            <div class="skill-details">
                <div class="skill-header">
                    <div class="skill-name ${skill.completed === 100 ? 'completed' : ''}">${skill.name}</div>
                    <div class="skill-meta">
                        <span class="skill-meta skill-priority ${skill.priority || 'medium'}">Priority = ${skill.priority || 'medium'}</span>
                        <span class="skill-meta skill-level ${skill.level || 'beginner'}">Level = ${skill.level || 'beginner'}</span>
                    </div>
                </div>
                
                <div class="skill-progress-container">
                    <div class="skill-progress">
                        <div class="progress-bar ${progressClass}" style="width: ${progressPercentage}%"></div>
                    </div>
                    <span class="progress-text">${progressPercentage}%</span>
                </div>

                <div class="skill-info">
                    <div class="skill-meta">
                        <i class="ri-book-open-line"></i>
                        <span>From: <a href="${skill.learningFrom}" target="_blank" class="learning-source-link">${skill.learningFrom}</a>
                        ${learningPlatforms[skill.learningFrom] ? 
                            `<a href="${learningPlatforms[skill.learningFrom].supportsSearch ? 
                                learningPlatforms[skill.learningFrom].url + encodeURIComponent(skill.name) : 
                                learningPlatforms[skill.learningFrom].url}" 
                                target="_blank" class="catalog-link">
                                ${learningPlatforms[skill.learningFrom].supportsSearch ? 'Search' : 'Go to'} ${skill.learningFrom}
                            </a>` : ''}</span>
                    </div>
                    <div class="skill-meta">
                        <i class="ri-calendar-line"></i>
                        <span>Start: ${formatDate(skill.startDate)}</span>
                    </div>
                    <div class="skill-meta">
                        <i class="ri-timer-line"></i>
                        <span>End: ${formatDate(skill.expectedEndDate)}</span>
                    </div>
                    <div class="skill-meta remaining-days ${timeLeft < 7 ? 'urgent' : ''}">
                        <i class="ri-time-line"></i>
                        <span>${timeLeft} days remaining</span>
                    </div>
                </div>

                ${skill.tags && skill.tags.length > 0 ? `
                    <div class="skill-tags">
                        ${skill.tags.map(tag => `<span class="tag">${tag.trim()}</span>`).join('')}
                    </div>
                ` : ''}
            </div>

            <div class="skill-actions">
                <button class="complete-button ${skill.completed === 100 ? 'completed' : ''}">
                    ${skill.completed === 100 ? 'Undo' : 'Complete'}
                </button>
                <button class="notes-button">
                    <i class="ri-sticky-note-line"></i>
                    <span class="notes-count">${Array.isArray(skill.days) ? skill.days.filter(day => day.completed).length : 0}</span>
                </button>
                <button class="documents-button">
                    <i class="ri-file-list-line"></i>
                    <span class="documents-count">${skill.documents ? skill.documents.length : 0}</span>
                </button>
                <button class="certificate-button">
                    <i class="ri-award-line"></i>
                </button>
                <button class="edit-button">
                    <i class="ri-edit-line"></i>
                </button>
                <button class="delete-button">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
        `;
        return li;
    }

    // Function to format date
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    // Function to render the skills list in the UI
    function renderSkills() {
        skillList.innerHTML = "";
        skillsData.forEach(skill => {
            const skillItem = createSkillElement(skill);
            skillItem.dataset.skillId = skill._id;
            skillList.appendChild(skillItem);
        });
    }

    // Function to reset the add skill input fields
    function resetInputFields() {
        skillInput.value = "";
        learningSourceInput.value = "";
        startDateInput.value = "";
        expectedEndDateInput.value = "";
        const fpStart = document.querySelector("#startDate")._flatpickr;
        if (fpStart) fpStart.clear();
        const fpEnd = document.querySelector("#expectedEndDate")._flatpickr;
        if (fpEnd) fpEnd.clear();
        const levelSelect = document.getElementById("skillLevel");
        if (levelSelect) levelSelect.value = "beginner";
    }

    // Function to hide the additional input fields for adding a skill
    function hideAdditionalInputs() {
        additionalInputs.style.display = "none";
        initialInput.style.marginBottom = "0";
        addSkillButton.textContent = "Add Skill";
        cancelAddButton.style.display = "none";
        showAdditionalInputs = false;
    }

    // --- Event Listeners ---

    // Event listener for input changes to show skill suggestions
    skillInput.addEventListener("input", function () {
        const inputText = this.value.toLowerCase();
        const filteredSuggestions = recommendedSkills.filter(skill =>
            skill.toLowerCase().startsWith(inputText) && skill.toLowerCase() !== inputText
        );
        displaySuggestions(filteredSuggestions.slice(0, 5));
    });

    // Event listener to hide suggestions when the skill input loses focus
    skillInput.addEventListener("blur", function () {
        setTimeout(() => {
            skillSuggestionsContainer.classList.remove("show");
        }, 200);
    });

    // Event listener for the "Add Skill" button
    addSkillButton.addEventListener("click", async function () {
        if (!showAdditionalInputs) {
            additionalInputs.style.display = "flex";
            initialInput.style.marginBottom = "10px";
            addSkillButton.textContent = "Save Skill";
            cancelAddButton.style.display = "inline-block";
            showAdditionalInputs = true;
        } else {
            const skillName = skillInput.value.trim();
            const learningFrom = learningSourceInput.value.trim();
            const startDate = startDateInput.value.split(' ')[0];
            const expectedEndDate = expectedEndDateInput.value.split(' ')[0];
            const prioritySelect = document.getElementById("skillPriority");
            const levelSelect = document.getElementById("skillLevel");
            const priority = prioritySelect ? prioritySelect.value : 'medium';
            const level = levelSelect ? levelSelect.value : 'beginner';
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!skillName || !learningFrom || !startDate || !expectedEndDate) {
                alert('Please fill in all the skill details.');
                return;
            }
            if (!dateRegex.test(startDate) || !dateRegex.test(expectedEndDate)) {
                alert('Please select valid dates in YYYY-MM-DD format.');
                return;
            }
            const newSkill = {
                name: skillName,
                learningFrom: learningFrom,
                startDate: startDate,
                expectedEndDate: expectedEndDate,
                completed: 0,
                completionCertificate: null,
                notes: [],
                documents: [],
                priority: priority,
                level: level
            };
            try {
                const response = await fetch('/api/skills', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(newSkill),
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const savedSkill = await response.json();
                skillsData.push(savedSkill);
                await fetchSkills();
                renderSkills();
                resetInputFields();
                hideAdditionalInputs();
            } catch (error) {
                console.error('Error adding skill:', error);
                alert('Could not add skill. Please try again.');
            }
        }
    });

    // Event listener for the "Cancel" button when adding a skill
    cancelAddButton.addEventListener("click", function () {
        resetInputFields();
        hideAdditionalInputs();
        skillSuggestionsContainer.classList.remove("show");
    });

    // Add event listeners for skill actions
    skillList.addEventListener("click", function (event) {
        const target = event.target;
        const skillItem = target.closest(".skill-item");
        if (!skillItem) return;

        const skillId = skillItem.dataset.skillId;
        const skill = findSkillObject(skillId);
        if (!skill) return;

        if (target.closest(".complete-button")) {
            // Handle complete button
            const newStatus = skill.completed === 100 ? 0 : 100;
            updateSkillProgressBar(skillId, newStatus);
        } else if (target.closest(".notes-button")) {
            // Handle notes button
            showNotesModal(skill);
        } else if (target.closest(".documents-button")) {
            // Handle documents button
            showDocumentsModal(skill);
        } else if (target.closest(".certificate-button")) {
            // Handle certificate button
            showCertificateModal(skill);
        } else if (target.closest(".edit-button")) {
            // Handle edit button
            editSkill(skillId);
        } else if (target.closest(".delete-button")) {
            // Handle delete button
            if (confirm(`Are you sure you want to delete the skill "${skill.name}"?`)) {
                deleteSkill(skillId);
            }
        }
    });

    // Event listener for toggling the view (list/grid)
    viewToggle.addEventListener("click", function () {
        const isGrid = skillList.classList.toggle("grid-view");
        skillList.classList.toggle("list-view");
        // Update button text/icon
        if (isGrid) {
            this.innerHTML = '<i class="ri-list-check"></i> List View';
        } else {
            this.innerHTML = '<i class="ri-grid-fill"></i> Grid View';
        }
    });

    // Ensure initial label matches initial state
    if (skillList.classList.contains('grid-view')) {
        viewToggle.innerHTML = '<i class="ri-list-check"></i> List View';
    } else {
        viewToggle.innerHTML = '<i class="ri-grid-fill"></i> Grid View';
    }

    // Event listener for sorting the skills alphabetically
    sortToggle.addEventListener("click", function () {
        const sortOptions = document.createElement("div");
        sortOptions.classList.add("sort-options");
        sortOptions.innerHTML = `
            <button data-sort="name">Sort by Name</button>
            <button data-sort="priority">Sort by Priority</button>
            <button data-sort="level">Sort by Level</button>
            <button data-sort="progress">Sort by Progress</button>
            <button data-sort="deadline">Sort by Deadline</button>
        `;
        this.parentNode.appendChild(sortOptions);

        sortOptions.addEventListener("click", function(e) {
            if (e.target.tagName === "BUTTON") {
                sortSkills(e.target.dataset.sort);
                sortOptions.remove();
            }
        });

        // Remove sort options when clicking outside
        document.addEventListener("click", function removeSortOptions(e) {
            if (!e.target.closest(".sort-options") && !e.target.closest("#ssortToggle")) {
                sortOptions.remove();
                document.removeEventListener("click", removeSortOptions);
            }
        });
    });

    // --- Notes Modal Logic ---
    function showNotesModal(skill) {
        if (!notesModal || !notesSkillNameDisplay || !notesList) {
            console.error('Required modal elements not found');
            return;
        }

        // Add icon to the title
        notesSkillNameDisplay.innerHTML = `<i class="ri-book-open-line"></i> ${skill.name}`;
        notesList.innerHTML = '';

        if (skill.days && Array.isArray(skill.days)) {
            skill.days.forEach((day, i) => {
                const dayDiv = document.createElement('div');
                dayDiv.classList.add('day-note-item');
                
                // Format the date nicely
                const dateObj = new Date(day.date);
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                dayDiv.innerHTML = `
                    <div>
                        <strong>${formattedDate}</strong>
                        <div class="note-content">
                            <textarea class="day-note-textarea" data-day-index="${i}" 
                                placeholder="What did you learn today?">${day.note || ''}</textarea>
                            <div class="note-actions">
                                <button class="edit-note-btn" data-day-index="${i}">
                                    <span><i class="ri-edit-line"></i> Edit</span>
                                </button>
                                <button class="complete-day-btn" data-day-index="${i}" ${day.completed ? 'disabled' : ''}>
                                    <span><i class="ri-check-line"></i> ${day.completed ? 'Completed' : 'Complete Today\'s Learning'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                notesList.appendChild(dayDiv);
            });

            // Add event listeners for edit buttons
            notesList.querySelectorAll('.edit-note-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const dayIndex = parseInt(this.getAttribute('data-day-index'));
                    const textarea = notesList.querySelector(`.day-note-textarea[data-day-index="${dayIndex}"]`);
                    const noteActions = this.closest('.note-actions');
                    const day = skill.days[dayIndex];
                    
                    // Create edit controls
                    const editControls = document.createElement('div');
                    editControls.classList.add('edit-controls');
                    editControls.innerHTML = `
                        <button class="save-note-edit-btn" data-day-index="${dayIndex}">
                            <i class="ri-save-line"></i>
                            Save
                        </button>
                        <button class="cancel-note-edit-btn" data-day-index="${dayIndex}">
                            <i class="ri-close-line"></i>
                            Cancel
                        </button>
                    `;
                    
                    // Store original value
                    textarea.dataset.originalValue = textarea.value;
                    
                    // Enable textarea and add focus
                    textarea.readOnly = false;
                    textarea.focus();
                    
                    // Replace note actions with edit controls
                    noteActions.replaceWith(editControls);
                    
                    // Add event listeners for save and cancel
                    const saveBtn = editControls.querySelector('.save-note-edit-btn');
                    const cancelBtn = editControls.querySelector('.cancel-note-edit-btn');
                    
                    saveBtn.addEventListener('click', async function() {
                        const dayIndex = parseInt(this.getAttribute('data-day-index'));
                        const textarea = notesList.querySelector(`.day-note-textarea[data-day-index="${dayIndex}"]`);
                        const note = textarea.value.trim();
                        const day = skill.days[dayIndex];
                        
                        try {
                            // Show saving state
                            this.disabled = true;
                            this.innerHTML = '<i class="ri-loader-4-line"></i> Saving...';
                            
                            const response = await fetch(`/api/skills/${skill._id}/day/${day.date}`, {
                                method: 'PUT',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                },
                                body: JSON.stringify({ 
                                    note: note,
                                    completed: day.completed
                                })
                            });
                            
                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            
                            const updatedSkill = await response.json();
                            
                            // Update local data
                            const skillIndex = skillsData.findIndex(s => s._id === skill._id);
                            if (skillIndex !== -1) {
                                skillsData[skillIndex] = updatedSkill;
                            }
                            
                            // Update the note count in the skill list item
                            const skillItem = document.querySelector(`.skill-item[data-skill-id="${skill._id}"]`);
                            if (skillItem) {
                                const notesCountElement = skillItem.querySelector('.notes-count');
                                if (notesCountElement) {
                                    const completedDays = updatedSkill.days.filter(day => day.completed).length;
                                    notesCountElement.textContent = completedDays;
                                }
                            }
                            
                            // Show success state
                            this.innerHTML = '<i class="ri-check-line"></i> Saved!';
                            setTimeout(() => {
                                showNotesModal(updatedSkill); // Refresh modal
                            }, 1000);
                            
                        } catch (error) {
                            console.error('Error saving note:', error);
                            // Show error state
                            this.innerHTML = '<i class="ri-error-warning-line"></i> Failed';
                            setTimeout(() => {
                                this.innerHTML = '<i class="ri-save-line"></i> Save';
                                this.disabled = false;
                            }, 2000);
                            alert('Failed to save note. Please try again.');
                        }
                    });
                    
                    cancelBtn.addEventListener('click', function() {
                        const dayIndex = parseInt(this.getAttribute('data-day-index'));
                        const textarea = notesList.querySelector(`.day-note-textarea[data-day-index="${dayIndex}"]`);
                        const day = skill.days[dayIndex];
                        
                        // Restore original value
                        textarea.value = textarea.dataset.originalValue;
                        textarea.readOnly = true;
                        
                        // Restore note actions
                        const noteActions = document.createElement('div');
                        noteActions.classList.add('note-actions');
                        noteActions.innerHTML = `
                            <button class="edit-note-btn" data-day-index="${dayIndex}">
                                <span><i class="ri-edit-line"></i> Edit</span>
                            </button>
                            <button class="complete-day-btn" data-day-index="${dayIndex}" ${day.completed ? 'disabled' : ''}>
                                <span><i class="ri-check-line"></i> ${day.completed ? 'Completed' : 'Complete Today\'s Learning'}</span>
                            </button>
                        `;
                        
                        editControls.replaceWith(noteActions);
                    });
                });
            });

            // Add event listeners for complete buttons
            notesList.querySelectorAll('.complete-day-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const dayIndex = parseInt(this.getAttribute('data-day-index'));
                    const textarea = notesList.querySelector(`.day-note-textarea[data-day-index="${dayIndex}"]`);
                    const note = textarea.value.trim();
                    const day = skill.days[dayIndex];
                    
                    // Check if the day's date is today
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dayDate = new Date(day.date);
                    dayDate.setHours(0, 0, 0, 0);
                    
                    if (dayDate.getTime() !== today.getTime()) {
                        alert('You can only complete today\'s learning for the current date.');
                        return;
                    }
                    
                    // Add loading state
                    this.disabled = true;
                    const isCompleting = !day.completed;
                    this.innerHTML = `<i class="ri-loader-4-line"></i> ${isCompleting ? 'Completing...' : 'Undoing...'}`;
                    
                    try {
                        const response = await fetch(`/api/skills/${skill._id}/day/${day.date}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                note: note, 
                                completed: isCompleting 
                            })
                        });
                        
                        if (!response.ok) throw new Error('Failed to update day');
                        
                        const updatedSkill = await response.json();
                        
                        // Update local data and UI
                        const skillIndex = skillsData.findIndex(s => s._id === skill._id);
                        if (skillIndex !== -1) {
                            skillsData[skillIndex] = updatedSkill;
                            
                            // Update the note count in the skill list item
                            const skillItem = document.querySelector(`.skill-item[data-skill-id="${skill._id}"]`);
                            if (skillItem) {
                                const notesCountElement = skillItem.querySelector('.notes-count');
                                if (notesCountElement) {
                                    const completedDays = updatedSkill.days.filter(day => day.completed).length;
                                    notesCountElement.textContent = completedDays;
                                }
                            }
                        }
                        
                        // Show success animation
                        this.innerHTML = `<i class="ri-check-line"></i> ${isCompleting ? 'Completed!' : 'Undone!'}`;
                        setTimeout(() => {
                            showNotesModal(updatedSkill); // Refresh modal
                            updateSkillProgressBar(updatedSkill); // Update progress bar
                        }, 1000);
                        
                    } catch (error) {
                        console.error('Error updating day:', error);
                        // Show error state
                        this.innerHTML = '<i class="ri-error-warning-line"></i> Failed';
                        setTimeout(() => {
                            this.innerHTML = `<i class="ri-check-line"></i> ${day.completed ? 'Undo Completion' : 'Complete Today\'s Learning'}`;
                            this.disabled = false;
                        }, 2000);
                        alert('Failed to update day. Please try again.');
                    }
                });
            });

            // Update the button text based on completion status when creating the button
            const completeButtons = notesList.querySelectorAll('.complete-day-btn');
            completeButtons.forEach(btn => {
                const dayIndex = parseInt(btn.getAttribute('data-day-index'));
                const day = skill.days[dayIndex];
                btn.innerHTML = `<span><i class="ri-check-line"></i> ${day.completed ? 'Undo Completion' : 'Complete Today\'s Learning'}</span>`;
                btn.disabled = day.completed && new Date(day.date).toDateString() !== new Date().toDateString();
                
                // Add custom styling to the button
                btn.style.cssText = `
                    background: ${day.completed ? '#f0f0f0' : '#8a2be2'};
                    color: ${day.completed ? '#666' : 'white'};
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                `;
                
                // Add hover effect
                btn.onmouseover = function() {
                    if (!this.disabled) {
                        this.style.background = day.completed ? '#e0e0e0' : '#7b1fa2';
                        this.style.transform = 'translateY(-1px)';
                    }
                };
                
                btn.onmouseout = function() {
                    this.style.background = day.completed ? '#f0f0f0' : '#8a2be2';
                    this.style.transform = 'translateY(0)';
                };
            });

            // Add real-time note saving on blur
            notesList.querySelectorAll('.day-note-textarea').forEach(textarea => {
                textarea.addEventListener('blur', async function() {
                    const dayIndex = parseInt(this.getAttribute('data-day-index'));
                    const note = this.value.trim();
                    const day = skill.days[dayIndex];
                    
                    if (day.completed) return;
                    
                    try {
                        // Show saving indicator without changing the text
                        const originalValue = this.value;
                        const originalPlaceholder = this.placeholder;
                        this.placeholder = 'Saving...';
                        
                        await fetch(`/api/skills/${skill._id}/day/${day.date}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ note: note, completed: false })
                        });
                        
                        // Show saved indicator briefly
                        this.placeholder = 'Saved!';
                        setTimeout(() => {
                            this.placeholder = originalPlaceholder;
                        }, 1000);
                        
                    } catch (error) {
                        // Show error state
                        const originalPlaceholder = this.placeholder;
                        this.placeholder = 'Failed to save';
                        setTimeout(() => {
                            this.placeholder = originalPlaceholder;
                        }, 2000);
                    }
                });
            });
        } else {
            notesList.innerHTML = '<div class="no-days-message">No days found for this skill.</div>';
        }

        // Add animation when showing modal
        notesModal.classList.add("show");
    }

    function updateSkillProgressBar(skillId, newStatus) {
        // Find the skill object
        const skill = findSkillObject(skillId);
        if (!skill) {
            console.error('Skill not found');
            return;
        }

        // Update the skill's completion status on the server
        fetch(`/api/skills/${skillId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...skill,
                completed: newStatus
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update skill status');
            }
            return response.json();
        })
        .then(updatedSkill => {
            // Update local data
            const skillIndex = skillsData.findIndex(s => s._id === skillId);
            if (skillIndex !== -1) {
                skillsData[skillIndex] = updatedSkill;
            }

            // Find the skill item in the DOM and update the progress bar and percentage
            const skillItem = document.querySelector(`.skill-item[data-skill-id="${skillId}"]`);
            if (skillItem) {
                const progressBar = skillItem.querySelector('.progress-bar');
                const progressText = skillItem.querySelector('.progress-text');
                const completeButton = skillItem.querySelector('.complete-button');
                
                if (progressBar) progressBar.style.width = `${newStatus}%`;
                if (progressText) progressText.textContent = `${newStatus}%`;
                if (completeButton) {
                    completeButton.textContent = newStatus === 100 ? 'Undo' : 'Complete';
                    completeButton.classList.toggle('completed', newStatus === 100);
                }
            }

            // Update dashboard progress
            return fetch('/dashboard_data');
        })
        .then(response => response.json())
        .then(data => {
            // Update skill stats in the dashboard
            const skillStats = document.querySelectorAll('.skill-stats .stat-value');
            if (skillStats.length >= 2) {
                skillStats[0].textContent = data.skill_data.completed; // Mastered
                skillStats[1].textContent = data.skill_data.in_progress; // In Progress
            }

            // Update progress circle
            const progressCircles = document.querySelectorAll('.progress');
            progressCircles.forEach(circle => {
                if (circle.nextElementSibling && circle.nextElementSibling.textContent.includes('developed')) {
                    circle.nextElementSibling.textContent = `${data.skill_data.completion_percentage}% developed`;
                }
            });

            // Update skill count in the dashboard card
            const skillCountElements = document.querySelectorAll('.card h2');
            skillCountElements.forEach(element => {
                if (element.nextElementSibling && element.nextElementSibling.textContent.includes('Developed Skills')) {
                    element.textContent = data.skill_data.completed;
                }
            });
        })
        .catch(error => {
            console.error('Error updating skill status:', error);
            showNotification('Failed to update skill status', 'error');
        });
    }

    if (saveNoteButton) {
        saveNoteButton.addEventListener('click', async () => {
            const noteText = newNoteInput.value.trim();
            if (!noteText) return;

            try {
                // Show loading state
                saveNoteButton.disabled = true;
                saveNoteButton.innerHTML = '<i class="ri-loader-4-line"></i> Saving...';

                // Get the current skill object
                const skill = findSkillObject(currentSkillIdForNotes);
                if (!skill) {
                    throw new Error('Skill not found');
                }

                // Initialize notes array if it doesn't exist
                if (!skill.notes) {
                    skill.notes = [];
                }

                // Add the new note to the local skill object
                skill.notes.push({
                    text: noteText,
                    timestamp: new Date().toISOString()
                });

                // Update the local skillsData array
                const skillIndex = skillsData.findIndex(s => s._id === skill._id);
                if (skillIndex !== -1) {
                    skillsData[skillIndex] = skill;
                }

                // Send the update to the server
                const response = await fetch(`/api/skills/${skill._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        notes: skill.notes
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to save note');
                }

                // Show success state
                saveNoteButton.innerHTML = '<i class="ri-check-line"></i> Saved!';
                setTimeout(() => {
                    // Update the UI with the new note
                    showNotesModal(skill);
                    newNoteInput.value = '';
                    saveNoteButton.disabled = false;
                    saveNoteButton.innerHTML = '<i class="ri-save-line"></i> Save Note';
                }, 1000);

            } catch (error) {
                console.error('Error saving note:', error);
                saveNoteButton.innerHTML = '<i class="ri-error-warning-line"></i> Failed';
                setTimeout(() => {
                    saveNoteButton.disabled = false;
                    saveNoteButton.innerHTML = '<i class="ri-save-line"></i> Save Note';
                }, 2000);
                alert('Failed to save note. Please try again.');
            }
        });
    }

    if (closeNotesModal) {
        closeNotesModal.addEventListener("click", function () {
            notesModal.classList.remove("show");
            currentSkillIdForNotes = null;
        });
    }

    // --- Documents Modal Logic ---
    function showDocumentsModal(skill) {
        // First check if the modal exists
        const documentsModalElement = document.getElementById("documentsModal");
        if (!documentsModalElement) {
            console.error("Error: Documents modal not found in the DOM");
            return;
        }

        // Set the current skill ID for document uploads
        currentSkillIdForDocuments = skill._id;

        // Update skill name
        const documentsSkillNameDisplay = document.getElementById("documentsSkillName");
        if (documentsSkillNameDisplay) {
            documentsSkillNameDisplay.textContent = skill.name;
        }

        // Handle certificate display
        const certificateDisplay = document.getElementById("certificateDisplay");
        const certificateLinkDisplay = document.getElementById("certificateLink");
        
        if (certificateDisplay && certificateLinkDisplay) {
            if (skill.completionCertificate) {
                certificateLinkDisplay.textContent = skill.completionCertificate.split('/').pop();
                certificateLinkDisplay.href = skill.completionCertificate;
                certificateDisplay.style.display = "block";
            } else {
                certificateLinkDisplay.textContent = "No certificate added";
                certificateLinkDisplay.href = "#";
                certificateDisplay.style.display = "block";
            }
        }

        // Handle documents list
        const documentsListElement = document.getElementById("documentsList");
        if (documentsListElement) {
            documentsListElement.innerHTML = ''; // Clear previous documents
            if (skill.documents && skill.documents.length > 0) {
                skill.documents.forEach((docURL, index) => {
                    const listItem = document.createElement('div');
                    listItem.classList.add('document-item');
                    
                    const docLink = document.createElement('a');
                    docLink.href = docURL;
                    docLink.textContent = docURL.split('/').pop();
                    docLink.target = "_blank";
                    
                    const deleteButton = document.createElement('button');
                    deleteButton.classList.add('delete-document-button');
                    deleteButton.innerHTML = '<i class="ri-delete-bin-line"></i>';
                    deleteButton.onclick = () => deleteDocument(skill._id, index);
                    
                    listItem.appendChild(docLink);
                    listItem.appendChild(deleteButton);
                    documentsListElement.appendChild(listItem);
                });
            }
        }

        // Show the modal
        documentsModalElement.classList.add("show");
    }
    
    // Function to handle document deletion
    async function deleteDocument(skillId, documentIndex) {
        if (!confirm('Are you sure you want to delete this document?')) {
            return;
        }

        try {
            const skill = findSkillObject(skillId);
            if (skill && skill.documents && skill.documents[documentIndex]) {
                skill.documents.splice(documentIndex, 1);
                const response = await fetch(`/api/skills/${skillId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ documents: skill.documents }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const updatedSkill = await response.json();
                const index = skillsData.findIndex(s => s._id === updatedSkill._id);
                if (index !== -1) {
                    skillsData[index] = updatedSkill;
                    
                    // Update the document count in the skill list item
                    const skillItem = document.querySelector(`.skill-item[data-skill-id="${skillId}"]`);
                    if (skillItem) {
                        const documentsCountElement = skillItem.querySelector('.documents-count');
                        if (documentsCountElement) {
                            documentsCountElement.textContent = updatedSkill.documents ? updatedSkill.documents.length : 0;
                        }
                    }
                }
                showDocumentsModal(updatedSkill);
                alert('Document deleted successfully!');
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Could not delete document. Please try again.');
        }
    }

    // Add event listener for document upload
    if (uploadDocumentButton) {
        // Style the upload button to match certificate upload
        uploadDocumentButton.style.cssText = `
            background: #8a2be2;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 10px;
        `;

        // Add hover effect
        uploadDocumentButton.onmouseover = function() {
            this.style.background = '#7b1fa2';
            this.style.transform = 'translateY(-1px)';
        };
        
        uploadDocumentButton.onmouseout = function() {
            this.style.background = '#8a2be2';
            this.style.transform = 'translateY(0)';
        };

        // Style the file input container
        const uploadContainer = uploadNewDocumentInput.parentElement;
        if (uploadContainer) {
            uploadContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-top: 15px;
                padding: 15px;
                background: #f8f8f8;
                border-radius: 8px;
            `;
        }

        // Style the file input
        uploadNewDocumentInput.style.cssText = `
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            width: 100%;
            box-sizing: border-box;
        `;

        uploadDocumentButton.addEventListener("click", async function() {
            const file = document.getElementById("uploadNewDocument").files[0];
            if (!file) {
                alert('Please select a document to upload.');
                return;
            }

            // Add loading state
            this.disabled = true;
            this.innerHTML = '<i class="ri-loader-4-line"></i> Uploading...';

            const formData = new FormData();
            formData.append('document', file);
            formData.append('skillId', currentSkillIdForDocuments);
            try {
                const response = await fetch('/api/upload_document', {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                const skill = findSkillObject(currentSkillIdForDocuments);
                if (skill) {
                    if (!skill.documents) {
                        skill.documents = [];
                    }
                    skill.documents.push(result.url);
                    const index = skillsData.findIndex(s => s._id === currentSkillIdForDocuments);
                    if (index !== -1) {
                        skillsData[index] = skill;
                        
                        // Update the document count in the skill list item
                        const skillItem = document.querySelector(`.skill-item[data-skill-id="${currentSkillIdForDocuments}"]`);
                        if (skillItem) {
                            const documentsCountElement = skillItem.querySelector('.documents-count');
                            if (documentsCountElement) {
                                documentsCountElement.textContent = skill.documents.length;
                            }
                        }
                    }
                    showDocumentsModal(skill);
                    
                    // Show success state
                    this.innerHTML = '<i class="ri-check-line"></i> Uploaded!';
                    setTimeout(() => {
                        this.innerHTML = '<i class="ri-upload-line"></i> Upload Document';
                        this.disabled = false;
                        uploadNewDocumentInput.value = ''; // Clear the file input
                    }, 1000);
                }
            } catch (error) {
                console.error('Error uploading document:', error);
                // Show error state
                this.innerHTML = '<i class="ri-error-warning-line"></i> Failed';
                setTimeout(() => {
                    this.innerHTML = '<i class="ri-upload-line"></i> Upload Document';
                    this.disabled = false;
                }, 2000);
                alert('Could not upload document. Please try again.');
            }
        });
    }
    
    if (closeDocumentsModal) {
        closeDocumentsModal.addEventListener("click", function () {
            const documentsModalElement = document.getElementById("documentsModal");
            if (documentsModalElement) {
                documentsModalElement.classList.remove("show");
            }
            currentSkillIdForDocuments = null;
        });
    }
    
    // --- Certificate Modal Logic (Potentially Redundant) ---
    function showCertificateModal(skill) {
        certificateSkillNameDisplay.textContent = skill.name;
        // Clear the file input
        const certificateFileInput = document.getElementById("certificateFile");
        if (certificateFileInput) {
            certificateFileInput.value = '';
        }
        certificateModal.classList.add("show");
        currentSkillIdForCertificate = skill._id;
    }
    
    if (closeCertificateModal) {
        closeCertificateModal.addEventListener("click", function () {
            certificateModal.classList.remove("show");
        });
    }
    
    // --- General Modal Closing on Outside Click ---
    window.addEventListener("click", function (event) {
        if (event.target === notesModal) {
            notesModal.classList.remove("show");
            currentSkillIdForNotes = null;
        }
        const documentsModalElement = document.getElementById("documentsModal");
        if (event.target === documentsModalElement) {
            documentsModalElement.classList.remove("show");
            currentSkillIdForDocuments = null;
        }
        if (event.target === certificateModal) {
            certificateModal.classList.remove("show");
        }
    });
    
    // Initial fetch of skills on load
    await fetchSkills();
    renderSkills(); // Ensure initial rendering

    // Add event listener for learning source input
    document.getElementById("learningSource").addEventListener("input", function() {
        const inputText = this.value.toLowerCase();
        const filteredSuggestions = recommendedSources.filter(source =>
            source.toLowerCase().includes(inputText)
        );
        displaySourceSuggestions(filteredSuggestions);
    });

    // Function to handle skill editing
    async function editSkill(skillId) {
        const skill = findSkillObject(skillId);
        if (!skill) return;

        const editModal = document.getElementById("editModal");
        const editSkillName = document.getElementById("editSkillName");
        const editLearningSource = document.getElementById("editLearningSource");
        const editStartDate = document.getElementById("editStartDate");
        const editEndDate = document.getElementById("editEndDate");
        const editSkillLevel = document.getElementById("editSkillLevel");
        const editSkillPriority = document.getElementById("editSkillPriority");
        const saveEdit = document.getElementById("saveEdit");
        const cancelEdit = document.getElementById("cancelEdit");
        const closeButton = editModal.querySelector(".close-button");

        // Populate the form with skill data
        editSkillName.value = skill.name;
        editLearningSource.value = skill.learningFrom;
        editStartDate.value = skill.startDate;
        editEndDate.value = skill.expectedEndDate;
        editSkillLevel.value = skill.level;
        editSkillPriority.value = skill.priority;

        // Initialize flatpickr for date inputs
        flatpickr(editStartDate, {
            dateFormat: "Y-m-d",
            defaultDate: skill.startDate
        });
        flatpickr(editEndDate, {
            dateFormat: "Y-m-d",
            defaultDate: skill.expectedEndDate
        });

        // Show the modal with animation
        editModal.classList.add("show");

        // Handle save button click
        saveEdit.onclick = async function() {
            const updatedSkill = {
                name: editSkillName.value.trim(),
                learningFrom: editLearningSource.value.trim(),
                startDate: editStartDate.value,
                expectedEndDate: editEndDate.value,
                level: editSkillLevel.value,
                priority: editSkillPriority.value,
                completed: skill.completed,
                notes: skill.notes,
                documents: skill.documents
            };

            try {
                const response = await fetch(`/api/skills/${skillId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updatedSkill),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const updatedSkillData = await response.json();
                const index = skillsData.findIndex(s => s._id === updatedSkillData._id);
                if (index !== -1) {
                    skillsData[index] = updatedSkillData;
                }
                await fetchSkills();
                renderSkills();
                editModal.classList.remove("show");
            } catch (error) {
                console.error('Error updating skill:', error);
                alert('Could not update skill. Please try again.');
            }
        };

        // Handle cancel button click
        cancelEdit.onclick = function() {
            editModal.classList.remove("show");
        };

        // Handle close button click
        closeButton.onclick = function() {
            editModal.classList.remove("show");
        };

        // Handle click outside modal
        editModal.onclick = function(event) {
            if (event.target === editModal) {
                editModal.classList.remove("show");
            }
        };
    }

    // Function to handle skill sorting
    function sortSkills(criteria) {
        const skills = Array.from(skillList.children);
        skills.sort((a, b) => {
            switch(criteria) {
                case 'name':
                    return a.querySelector(".skill-name").textContent.localeCompare(b.querySelector(".skill-name").textContent);
                case 'priority':
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    return priorityOrder[a.dataset.priority] - priorityOrder[b.dataset.priority];
                case 'level':
                    const levelOrder = { advanced: 0, intermediate: 1, beginner: 2 };
                    return levelOrder[a.dataset.level] - levelOrder[b.dataset.level];
                case 'progress':
                    const progressA = parseInt(a.querySelector(".progress-text").textContent);
                    const progressB = parseInt(b.querySelector(".progress-text").textContent);
                    return progressB - progressA;
                case 'deadline':
                    const daysA = parseInt(a.querySelector(".remaining-days").textContent);
                    const daysB = parseInt(b.querySelector(".remaining-days").textContent);
                    return daysA - daysB;
                default:
                    return 0;
            }
        });
        skillList.innerHTML = "";
        skills.forEach(skill => skillList.appendChild(skill));
    }

    function deleteSkill(skillId) {
        if (confirm('Are you sure you want to delete this skill?')) {
            fetch(`/api/skills/${skillId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (response.ok) {
                    // Remove the skill element from the DOM
                    const skillElement = document.querySelector(`[data-skill-id="${skillId}"]`);
                    if (skillElement) {
                        skillElement.remove();
                    }
                    // Show success message
                    showNotification('Skill deleted successfully', 'success');
                    // Refresh the skills display using fetchSkills instead of loadSkills
                    fetchSkills();
                } else {
                    throw new Error('Failed to delete skill');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error deleting skill', 'error');
            });
        }
    }
});