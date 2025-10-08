
const adminUsername = "admin";
const adminPassword = "Admin-Pass123!";

document.getElementById('username').addEventListener('click', function() {
    document.getElementById('error-message').style.display = 'none';
});
document.getElementById('password').addEventListener('click', function() {
    document.getElementById('error-message').style.display = 'none';
});

document.addEventListener('DOMContentLoaded', function() {
    localStorage.removeItem('loggedIn');
});

document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the default form submission

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === adminUsername && password === adminPassword) {
        localStorage.setItem('loggedIn', 'true');
        // Redirect to admin dashboard
        window.location.href = 'mainPanel.html';
    } else {
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('error-message').innerHTML = 'Invalid credentials. Please try again.';
    }
});