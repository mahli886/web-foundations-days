// Select HTML elements
const noteText = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearBtn = document.querySelector("#clear-btn");
const themeToggle = document.querySelector("#theme-toggle");

// Update character and word counters
function updateCounts() {
    const text = noteText.value;
    const characters = text.length;

    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

    charCount.textContent = characters + " / 200 characters";
    wordCount.textContent = words + " words";

    charCount.classList.remove("warning", "over");

    if (characters > 200) {
        charCount.classList.add("over");
    } else if (characters > 180) {
        charCount.classList.add("warning");
    }
}

// Save draft
function saveDraft() {
    localStorage.setItem("notesDraft", noteText.value);
}

// Clear notes
function clearNotes() {
    noteText.value = "";
    updateCounts();
    localStorage.removeItem("notesDraft");
}

// Listen for typing
noteText.addEventListener("input", function() {
    updateCounts();
    saveDraft();
});

// Clear button
clearBtn.addEventListener("click", clearNotes);

// Escape key
noteText.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        clearNotes();
    }
});

// Theme toggle
themeToggle.addEventListener("click", function() {
    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");

    themeToggle.textContent = isDark ? "Light mode" : "Dark mode";

    localStorage.setItem("notesTheme", isDark ? "dark" : "light");
});

// Restore saved data
function loadSavedData() {
    const savedDraft = localStorage.getItem("notesDraft");

    if (savedDraft !== null) {
        noteText.value = savedDraft;
    }

    const savedTheme = localStorage.getItem("notesTheme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        themeToggle.textContent = "Light mode";
    } else {
        document.body.classList.remove("dark");
        themeToggle.textContent = "Dark mode";
    }

    updateCounts();
}

// Run when page loads
loadSavedData();