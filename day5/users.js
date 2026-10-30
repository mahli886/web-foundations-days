// Get HTML elements
const loadButton = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const statusMessage = document.getElementById("status");
const usersList = document.getElementById("users-list");

// Store loaded users
let users = [];

// Function to display users
function renderUsers(list) {
usersList.innerHTML = "";


if (list.length === 0) {
    usersList.textContent = "No users match your filter.";
    return;
}

list.forEach(user => {
    const li = document.createElement("li");

    const name = document.createElement("h3");
    name.textContent = user.name;

    const email = document.createElement("p");
    email.textContent = `Email: ${user.email}`;

    const city = document.createElement("p");
    city.textContent = `City: ${user.address.city}`;

    const company = document.createElement("p");
    company.textContent = `Company: ${user.company.name}`;

    li.appendChild(name);
    li.appendChild(email);
    li.appendChild(city);
    li.appendChild(company);

    usersList.appendChild(li);
});


}

// Function to load users from API
async function loadUsers() {
loadButton.disabled = true;
statusMessage.textContent = "Loading users...";

try {
    const response = await fetch(
       "https://jsonplaceholder.typicode.com/users"
    );

    if (!response.ok) {
        throw new Error("Failed to load users.");
    }

    users = await response.json();

    renderUsers(users);

    statusMessage.textContent = `Successfully loaded ${users.length} users.`;

} catch (error) {
    statusMessage.textContent = "Error loading users. Please try again.";
    console.error(error);

} finally {
    loadButton.disabled = false;
}


}

// Load users when button is clicked
loadButton.addEventListener("click", loadUsers);

// Filter users when typing
filterInput.addEventListener("input", () => {
const searchText = filterInput.value.toLowerCase();

const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchText)
);

renderUsers(filteredUsers);


});
