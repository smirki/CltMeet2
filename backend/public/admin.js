// admin.js

document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('loginSection');
    const adminDashboard = document.getElementById('adminDashboard');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const logoutButton = document.getElementById('logoutButton');

    const addEventButton = document.getElementById('addEventButton');
    const deleteEventButton = document.getElementById('deleteEventButton');
    const makeAdminButton = document.getElementById('makeAdminButton');
    const deleteUserButton = document.getElementById('deleteUserButton');
    const refreshUsersButton = document.getElementById('refreshUsersButton');
    const userList = document.getElementById('userList');

    let adminToken = localStorage.getItem('adminToken');

    if (adminToken) {
        showDashboard();
    } else {
        showLogin();
    }

    // Handle Login Form Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        await adminLogin(email, password);
    });

    // Handle Logout
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        adminToken = null;
        showLogin();
    });

    // Handle Add Event
    addEventButton.addEventListener('click', addEvent);

    // Handle Delete Event
    deleteEventButton.addEventListener('click', deleteEvent);

    // Handle Make Admin
    makeAdminButton.addEventListener('click', makeAdmin);

    // Handle Delete User
    deleteUserButton.addEventListener('click', deleteUser);

    // Handle Refresh Users
    refreshUsersButton.addEventListener('click', fetchUsers);

    // Admin Login Function
    async function adminLogin(email, password) {
        try {
            const response = await fetch('/adminLogin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const result = await response.json();
            if (response.ok && result.token) {
                adminToken = result.token;
                localStorage.setItem('adminToken', adminToken);
                showDashboard();
            } else {
                loginError.textContent = result.error || 'Login failed';
            }
        } catch (error) {
            loginError.textContent = 'Error logging in. Please try again.';
            console.error('Login error:', error);
        }
    }

    // Show Admin Dashboard
    function showDashboard() {
        loginSection.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        loginError.textContent = '';
        fetchUsers(); // Load users on dashboard
    }

    // Show Login Section
    function showLogin() {
        loginSection.classList.remove('hidden');
        adminDashboard.classList.add('hidden');
    }

    // Add Event Function
    async function addEvent() {
        const title = document.getElementById('eventTitle').value.trim();
        const description = document.getElementById('eventDescription').value.trim();
        const locationName = document.getElementById('eventLocationName').value.trim();
        const locationLatitude = parseFloat(document.getElementById('eventLocationLatitude').value.trim());
        const locationLongitude = parseFloat(document.getElementById('eventLocationLongitude').value.trim());
        const totalSlots = parseInt(document.getElementById('eventTotalSlots').value.trim());
        const cost = parseFloat(document.getElementById('eventCost').value.trim()) * 100; // Convert to cents
        const date = document.getElementById('eventDate').value.trim();
        const imageUrl = document.getElementById('eventImageUrl').value.trim();

        if (!title || !description || !locationName || isNaN(locationLatitude) || isNaN(locationLongitude) || isNaN(totalSlots) || isNaN(cost) || !date) {
            alert('Please provide all the required fields.');
            return;
        }

        if (!confirm(`Are you sure you want to add the event "${title}"?`)) {
            return;
        }

        try {
            const response = await fetch('/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + adminToken
                },
                body: JSON.stringify({
                    title,
                    description,
                    location: {
                        name: locationName,
                        latitude: locationLatitude,
                        longitude: locationLongitude
                    },
                    totalSlots,
                    cost,
                    date,
                    imageUrl
                })
            });
            const result = await response.json();
            if (response.ok) {
                alert('Event added successfully.');
                clearEventForm();
            } else {
                alert(result.error || 'Failed to add event.');
            }
        } catch (error) {
            alert('Error adding event. Please try again.');
            console.error('Add event error:', error);
        }
    }

    // Clear Event Form Fields
    function clearEventForm() {
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventDescription').value = '';
        document.getElementById('eventLocationName').value = '';
        document.getElementById('eventLocationLatitude').value = '';
        document.getElementById('eventLocationLongitude').value = '';
        document.getElementById('eventTotalSlots').value = '';
        document.getElementById('eventCost').value = '';
        document.getElementById('eventDate').value = '';
        document.getElementById('eventImageUrl').value = '';
    }

    // Delete Event Function
    async function deleteEvent() {
        const eventId = document.getElementById('deleteEventId').value.trim();

        if (!eventId) {
            alert('Please provide the Event ID to delete.');
            return;
        }

        if (!confirm(`Are you sure you want to delete the event with ID "${eventId}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + adminToken
                }
            });
            const result = await response.json();
            if (response.ok) {
                alert('Event deleted successfully.');
                document.getElementById('deleteEventId').value = '';
            } else {
                alert(result.error || 'Failed to delete event.');
            }
        } catch (error) {
            alert('Error deleting event. Please try again.');
            console.error('Delete event error:', error);
        }
    }

    // Make Admin Function
    async function makeAdmin() {
        const email = document.getElementById('makeAdminEmail').value.trim();

        if (!email) {
            alert('Please provide the user email to make admin.');
            return;
        }

        if (!confirm(`Are you sure you want to make ${email} an admin?`)) {
            return;
        }

        try {
            const response = await fetch('/makeAdmin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + adminToken
                },
                body: JSON.stringify({ email })
            });
            const result = await response.json();
            if (response.ok) {
                alert(`${email} has been made an admin.`);
                document.getElementById('makeAdminEmail').value = '';
                fetchUsers(); // Refresh user list
            } else {
                alert(result.error || 'Failed to make user admin.');
            }
        } catch (error) {
            alert('Error making user admin. Please try again.');
            console.error('Make admin error:', error);
        }
    }

    // Delete User Function
    async function deleteUser() {
        const email = document.getElementById('deleteUserEmail').value.trim();

        if (!email) {
            alert('Please provide the user email to delete.');
            return;
        }

        if (!confirm(`Are you sure you want to delete the user with email "${email}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch('/deleteUser', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + adminToken
                },
                body: JSON.stringify({ email })
            });
            const result = await response.json();
            if (response.ok) {
                alert(`User ${email} has been deleted.`);
                document.getElementById('deleteUserEmail').value = '';
                fetchUsers(); // Refresh user list
            } else {
                alert(result.error || 'Failed to delete user.');
            }
        } catch (error) {
            alert('Error deleting user. Please try again.');
            console.error('Delete user error:', error);
        }
    }

    // Fetch Users Function
    async function fetchUsers() {
        try {
            const response = await fetch('/users', { // Ensure you have a /users endpoint
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + adminToken
                }
            });
            const result = await response.json();
            if (response.ok && result.users) {
                displayUsers(result.users);
            } else {
                alert(result.error || 'Failed to fetch users.');
            }
        } catch (error) {
            alert('Error fetching users. Please try again.');
            console.error('Fetch users error:', error);
        }
    }

    // Display Users Function
    function displayUsers(users) {
        userList.innerHTML = '';
        if (users.length === 0) {
            userList.textContent = 'No users found.';
            return;
        }

        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.classList.add('user-item');
            userItem.innerHTML = `
                <strong>Email:</strong> ${user.email}<br>
                <strong>Name:</strong> ${user.name}<br>
                <strong>Admin:</strong> ${user.admin ? 'Yes' : 'No'}<br>
                <button onclick="editUser('${user.uid}')">Edit</button>
            `;
            userList.appendChild(userItem);
        });
    }

    // Placeholder for Edit User Function
    window.editUser = function(uid) {
        // Implement edit user functionality, e.g., change user role, reset password, etc.
        const newRole = prompt('Enter new role for the user (admin/user):');
        if (newRole === 'admin') {
            makeUserAdminByUID(uid);
        } else if (newRole === 'user') {
            demoteUserByUID(uid);
        } else {
            alert('Invalid role entered.');
        }
    }

    // Make User Admin by UID
    async function makeUserAdminByUID(uid) {
        if (!confirm('Are you sure you want to make this user an admin?')) {
            return;
        }

        try {
            const response = await fetch('/makeAdminByUID', { // You need to create this endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + adminToken
                },
                body: JSON.stringify({ uid })
            });
            const result = await response.json();
            if (response.ok) {
                alert('User has been promoted to admin.');
                fetchUsers();
            } else {
                alert(result.error || 'Failed to promote user.');
            }
        } catch (error) {
            alert('Error promoting user. Please try again.');
            console.error('Promote user error:', error);
        }
    }

    // Demote User by UID
    async function demoteUserByUID(uid) {
        if (!confirm('Are you sure you want to demote this user from admin?')) {
            return;
        }

        try {
            const response = await fetch('/demoteUserByUID', { // You need to create this endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + adminToken
                },
                body: JSON.stringify({ uid })
            });
            const result = await response.json();
            if (response.ok) {
                alert('User has been demoted from admin.');
                fetchUsers();
            } else {
                alert(result.error || 'Failed to demote user.');
            }
        } catch (error) {
            alert('Error demoting user. Please try again.');
            console.error('Demote user error:', error);
        }
    }

    // You can add more functions to handle other admin features
});
