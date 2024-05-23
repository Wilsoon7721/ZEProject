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
            let data = await resp.json();
            username = data[0].username;
            fullName = data[0].fullName;
            authButton.innerText = username;
        }); 
        authButton.removeAttribute('onclick'); // Do not perform any action upon clicking when user is logged in
        logoutButton.removeAttribute('hidden'); // Unhide logout button
        logoutButton.addEventListener('click', () => {
            // On Logout Button pressed, delete cookie and refresh.
            document.cookie = "userID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            // Get current page, and re-send user back to page which will refresh the session.
            let current = window.location.href;
            document.write('Redirecting...');
            setTimeout(() => window.location.href = current, 1000);
            // Consider moving this whole segment into injector.js such that the buttons dont need to have their onclick set multiple times
        });

        // More Logged In User Code
    } else {
        // Logged Out, Default Page should show preview banner
        let previewBanner = document.getElementById('customer-preview');
        previewBanner.removeAttribute('hidden');
        let navBar = document.querySelector('.navbar');
        navBar.classList.remove('fixed-top');
    }
});