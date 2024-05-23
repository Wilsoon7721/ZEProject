document.addEventListener("DOMContentLoaded", () => {
    // Align header first
    let barHeight = document.querySelector('.navbar').offsetHeight;
    let pageTitle = document.getElementById("page-title");
    pageTitle.style.marginTop = `${barHeight + 10}px`;

    // Settle Login Matters
    let userID = getUserID();
    let authButton = document.getElementById('user-login-button');
    let logoutButton = document.getElementById('user-logout-button');
    if(userID !== -1) {
        // User ID does not return empty

        let username, fullName;
        fetch(`/users/${userID}`, {
            method: 'GET',
            headers: {
                'X-Internal-Endpoint': 'true'
            }
        })
        .then(async resp => {
            if(!resp.ok) {
                console.error("Failed to populate user info.");
                return;
            }
            data = await resp.json();
            console.log(data[0]);
            username = data[0].username;
            fullName = data[0].fullName;
        }); 
        authButton.removeAttribute('onclick'); // Do not perform any action upon clicking when user is logged in
        authButton.innerText = username;
        logoutButton.removeAttribute('hidden'); // Unhide logout button
        logoutButton.addEventListener('onclick', () => {
            // On Logout Button pressed, delete cookie and refresh.
            document.cookie = "userID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            // Get current page, and re-send user back to page which will refresh the session.
            
            // Consider moving this whole segment into injector.js such that the buttons dont need to have their onclick set multiple times
        });
    }
});