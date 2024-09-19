// admin.js
async function addEvent() {
    const title = document.getElementById('eventTitle').value;
    const description = document.getElementById('eventDescription').value;
    const response = await fetch('/events', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('adminToken') // Use stored admin token
        },
        body: JSON.stringify({ title, description })
    });
    const result = await response.json();
    alert(result.message || result.error);
}

async function deleteEvent() {
    const eventId = document.getElementById('eventId').value;
    const response = await fetch(`/events/${eventId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
        }
    });
    const result = await response.json();
    alert(result.message || result.error);
}

async function makeAdmin() {
    const email = document.getElementById('userEmail').value;
    const response = await fetch('/makeAdmin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
        },
        body: JSON.stringify({ email })
    });
    const result = await response.json();
    alert(result.message || result.error);
}

async function deleteUser() {
    const email = document.getElementById('userEmail').value;
    const response = await fetch('/deleteUser', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
        },
        body: JSON.stringify({ email })
    });
    const result = await response.json();
    alert(result.message || result.error);
}

// Implement a simple login mechanism for admin
async function adminLogin() {
    const email = prompt('Enter admin email:');
    const password = prompt('Enter admin password:');
    const response = await fetch('/adminLogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const result = await response.json();
    if (result.token) {
        localStorage.setItem('adminToken', result.token);
        alert('Admin login successful');
    } else {
        alert(result.error || 'Login failed');
    }
}

// Automatically prompt for admin login on page load
window.onload = () => {
    if (!localStorage.getItem('adminToken')) {
        adminLogin();
    }
};
