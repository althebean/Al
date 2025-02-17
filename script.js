// Select the theme toggle button
const themeToggle = document.getElementById("theme-toggle");

// Check for a saved theme preference in local storage
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.textContent = "Light Mode";
}

// Toggle between dark and light mode
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    // Save the user's preference in local storage
    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
        themeToggle.textContent = "Light Mode";
    } else {
        localStorage.setItem("theme", "light");
        themeToggle.textContent = "Dark Mode";
    }
});
