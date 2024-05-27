document.addEventListener('DOMContentLoaded', () => {
    // Load Bootstrap Components
    let link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css';
    link.integrity = 'sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    // Bootstrap Icons
    let bsIcons = document.createElement('link');
    bsIcons.rel = 'stylesheet';
    bsIcons.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
    document.head.appendChild(bsIcons);

    // Bootstrap JS
    let script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js';
    script.integrity = 'sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM';
    script.crossOrigin = 'anonymous';
    document.body.appendChild(script);

    // JQuery
    let jquery = document.createElement('script');
    jquery.src = "https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js";
    document.body.appendChild(jquery);

    // Align Page Title
    let barHeight = document.querySelector('.navbar').offsetHeight;
    let pageTitle = document.getElementById("page-title");
    pageTitle.style.marginTop = `${barHeight + 10}px`;

    // Settle Login Matters
    let userID = getUserID();
    let authButton = document.getElementById('user-login-button');
    let logoutButton = document.getElementById('user-logout-button');
    let cartButton = document.getElementById('user-cart-button');
    let cartItemsCount = document.getElementById('user-cart-item-count');
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
        cartButton.removeAttribute('hidden');
        cartButton.addEventListener('click', () => {
            window.location.href = '/cart';
        });
        fetch('/cart', {
            method: 'GET',
            headers: {
                'X-Internal-Endpoint': 'true',
                'X-Return-Size-Only': 'true'
            }
        })
        .then(async resp => {
            if(!resp.ok) {
                showToast("Could Not Obtain Cart", "Your existing cart could not be obtained.", "images/cross.jpg");
                return;
            }
            let data = await resp.json();
            cartItemsCount.innerText = data.size;
        });
    } else {
        // Logged Out, Default Page should show preview banner
        let previewBanner = document.getElementById('customer-preview');
        previewBanner.removeAttribute('hidden');
        let navBar = document.querySelector('.navbar');
        navBar.classList.remove('fixed-top');
    }
});

function getUserID() {
    let cookies = document.cookie.split(';');
    for(let cookie of cookies) {
        cookie = cookie.trim();
        if(cookie.startsWith("userID")) {
            let val = cookie.substring("userID=".length);
            return parseInt(val);
        }
        continue;
    }
    return -1;
}