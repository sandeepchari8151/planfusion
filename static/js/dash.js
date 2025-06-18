const menuBtn = document.getElementById("menu-btn");
const navLinks = document.getElementById("nav-links");
const menuBtnIcon = menuBtn.querySelector("i");

menuBtn.addEventListener("click", (e)=>{
    navLinks.classList.toggle("open");

    const isOpen = navLinks.classList.contains("open");
    menuBtnIcon.setAttribute("class", isOpen? "ri-close-line" : "ri-menu-line");
}); 

navLinks.addEventListener("click", (e) => {
  if (e.target.tagName === "A") { // Only close when clicking a link
      navLinks.classList.remove("open");
      menuBtnIcon.setAttribute("class", "ri-menu-line");
  }
});


const scrollRevealOption = {
    distance: "50px",
    origin: "bottom",
    duration: 1000,
  };
  
  ScrollReveal().reveal(".header_img img", {
    ...scrollRevealOption,
    origin: "right",
  });
  
  ScrollReveal().reveal(".header_content h1", {
    ...scrollRevealOption,
    delay: 500,
  });
  
  ScrollReveal().reveal(".header_content p", {
    ...scrollRevealOption,
    delay: 1000,
  });
  
  ScrollReveal().reveal(".header_content form", {
    ...scrollRevealOption,
    delay: 1500,
  });
  
  ScrollReveal().reveal(" .bar", {
    ...scrollRevealOption,
    delay: 2000,
  });
  
  ScrollReveal().reveal(".header_img_card", {
    duration: 1000,
    interval: 500,
    delay: 2500,
  });


  document.addEventListener("DOMContentLoaded", function () {
    const taskInput = document.getElementById("taskInput");
    const skillInput = document.getElementById("skillInput");
    const followUpInput = document.getElementById("followUpInput");

    // Initially, remove any placeholders
    taskInput.setAttribute("placeholder", "");
    skillInput.setAttribute("placeholder", "");
    followUpInput.setAttribute("placeholder", "");

    const tasks = [
      "Finish report ",  
      "Update project",  
      "Organize worksp", 
      "Reply to email",  
      "Prepare meeting"  
  ];
  
  const skills = [
      "Learn Python", 
      "Master JS   ",  
      "Public speak",  
      "Leadership  ",  
      "Productivity"   
  ];
  
  const followUps = [
      "Check in ment",  
      "Follow-up mail", 
      "Schedule chat ", 
      "Reconnect coll", 
      "Review notes  "  
  ];
  

    let index = 0; // Track current topic index

    function typeEffect() {
        let charIndex = 1;
        let currentTask = tasks[index];
        let currentSkill = skills[index];
        let currentFollowUp = followUps[index];

        function typing() {
            if (charIndex <= currentTask.length) {
                taskInput.setAttribute("placeholder", currentTask.substring(0, charIndex));
                skillInput.setAttribute("placeholder", currentSkill.substring(0, charIndex));
                followUpInput.setAttribute("placeholder", currentFollowUp.substring(0, charIndex));
                charIndex++;
                setTimeout(typing, 150); // Typing speed
            } else {
                setTimeout(() => {
                    index = (index + 1) % tasks.length; // Move to next topic
                    typeEffect(); // Restart typing
                }, 2000); // Pause before switching
            }
        }
        typing();
    }

    // Delay start by 3 seconds (3000ms) and remove placeholder visibility before that
    setTimeout(typeEffect, 3000);
});




  ScrollReveal().reveal(".about-content", { 
    distance: "50px", 
    origin: "left", 
    duration: 1000, 
    delay: 200 
});

ScrollReveal().reveal(".about-image img", { 
    distance: "60px", 
    origin: "right", 
    duration: 1000, 
    delay: 400 
});

ScrollReveal().reveal(".contact-container h2", { 
  distance: "70px", 
  origin: "top", 
  duration: 1000, 
  delay: 200 
});

ScrollReveal().reveal(".contact-container p", { 
  distance: "80px", 
  origin: "top", 
  duration: 1000, 
  delay: 400 
});

ScrollReveal().reveal(".form-group", { 
  distance: "90px", 
  origin: "top", 
  duration: 1000, 
  delay: 800 
});


ScrollReveal().reveal(".sbtnf", { 
  distance: "100px", 
  origin: "top",   
  duration: 1000, 
  delay: 1200 
});


ScrollReveal().reveal(".feature-box", { 
  distance: "50px", 
  origin: "top", 
  duration: 1000, 
  interval: 500 // Adds a slight delay between each box reveal
});

//login
document.getElementById("loginBtn").addEventListener("click", function() {
  window.location.href = "/login";  // Redirect to Flask login route
});

//register
document.getElementById("regBtn").addEventListener("click", function() {
  window.location.href = "/register";  // Redirect to Flask login route
});

/*submit btn*/
document.querySelector(".submitBtn").addEventListener("click", function(event) {
  event.preventDefault(); // Prevent any default form behavior

  // Show a login alert message
  alert("Please log in before submitting!");

  // Redirect to the login page smoothly
  window.location.replace("/login");

  
});
//hides the submitted message
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(() => {
      const flashMessages = document.querySelectorAll(".flash-message");
      flashMessages.forEach(msg => {
          msg.style.opacity = "0";
          setTimeout(() => msg.remove(), 500);
      });
  }, 2000); // Hides after 3 seconds
});

document.addEventListener("DOMContentLoaded", function () {
  document.body.style.overflowX = "hidden"; 
});

document.addEventListener("DOMContentLoaded", function () {
  const learnMoreBtn = document.getElementById("learnMoreBtn");
  const overlay = document.getElementById("overlay");
  const closeBtn = document.getElementById("closeBtn");

  learnMoreBtn.addEventListener("click", function () {
      overlay.style.display = "flex"; // Show overlay
  });

  closeBtn.addEventListener("click", function () {
      overlay.style.display = "none"; // Hide overlay
  });

  // Close overlay when clicking outside content box
  overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
          overlay.style.display = "none";
      }
  });
});
