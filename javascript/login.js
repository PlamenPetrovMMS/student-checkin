
const adminUsername = "admin";
const adminPassword = "Admin-Pass123!";

document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the default form submission

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === adminUsername && password === adminPassword) {
        // Redirect to admin dashboard
        window.location.href = 'mainPanel.html';
    } else {
        document.getElementById('error-message').innerHTML = 'Invalid credentials. Please try again.';
    }

});

