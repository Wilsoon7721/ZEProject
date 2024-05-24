document.addEventListener("DOMContentLoaded", () => {
    // Align header first
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
    } else {
        // Logged Out, Default Page should show preview banner
        let previewBanner = document.getElementById('customer-preview');
        previewBanner.removeAttribute('hidden');
        let navBar = document.querySelector('.navbar');
        navBar.classList.remove('fixed-top');
    }

    // Next, handle product listings
    fetch('/products/all', {
        method: 'GET',
        headers: {
            'X-Internal-Endpoint': 'true'
        }
    })
    .then(async resp => {
        if(!resp.ok) {
            console.error("Failed to load products.");
            return;
        }
        let results = await resp.json();
        let addLast = [];
        for(let i = 0; i < results.length; i++) {
            let productId = results[i].productID;
            let sellerId = results[i].sellerID;
            let productName = results[i].productName;
            let productDescription = results[i].productDescription;
            let price = results[i].price;
            let stockCount = results[i].quantity;
            let createdAt = results[i].createdAt;
            // Format createdAt
            let timestamp = new Date(createdAt);
            let current = new Date();
            let millis = current - timestamp;
            let millisInDay = 1000 * 60 * 60 * 24;
            let days = Math.floor(millis / millisInDay);
            fetch(`/users/${sellerId}`, {
                method: 'GET',
                headers: {
                    'X-Internal-Endpoint': 'true'
                }
            })
            .then(async resp => {
                if(!resp.ok) {
                    console.error("Render Product Failed! Seller Username could not be retrieved.");
                    return;
                }
                let sellerName = (await resp.json())[0].username;
                renderProductInfo(productId, productName, productDescription, price, stockCount, sellerName, days);
            }); 
        }
    })
});

// Truncates Description if it exceeds this amount of characters.
const DESC_MAX_CHARACTERS = 200;
function renderProductInfo(productId, title, description, price, stockCount, sellerUsername, createdAt) {
    let mainDiv = document.createElement('div');
    mainDiv.style.maxWidth = '70%';
    mainDiv.classList.add('card', 'mb-4', 'mx-auto');

    let rowDiv = document.createElement('div');
    rowDiv.classList.add('row', 'g-0');

    let bodyColDiv = document.createElement('div');
    bodyColDiv.classList.add('col-md-9');

    let cardBodyDiv = document.createElement('div');
    cardBodyDiv.classList.add('card-body');

    let cardTitle = document.createElement('h5');
    cardTitle.classList.add('card-title');
    cardTitle.textContent = `${title}`; // Product Name
    cardBodyDiv.appendChild(cardTitle);

    let cardSubtitle = document.createElement('h6');
    cardSubtitle.classList.add('card-subtitle');
    cardSubtitle.textContent = `$${price}`; // Price
    cardBodyDiv.appendChild(cardSubtitle);
    cardBodyDiv.appendChild(document.createElement('br'));

    let productDescriptionElement = document.createElement('p');
    productDescriptionElement.classList.add('card-text');
    if(description.length > DESC_MAX_CHARACTERS)
        description = description.substring(0, DESC_MAX_CHARACTERS) + '...';    
    productDescriptionElement.textContent = description; // Description
    cardBodyDiv.appendChild(productDescriptionElement);

    let footerText = document.createElement('p');
    footerText.classList.add('card-text');
    let smallText = document.createElement('small');
    smallText.classList.add('text-muted');

    // Number to duration text converter
    let durationText = ""
    if(createdAt === 0) {
        durationText = "today";
    } else if(createdAt === 1) {
        durationText = "a day ago";
    } else {
        durationText = `${createdAt} days ago`;
    }
    smallText.textContent = `Created ${durationText} ◦ Sold by ${sellerUsername} ◦ ID ${productId}`;
    footerText.appendChild(smallText);
    cardBodyDiv.appendChild(footerText);

    // Append card body to the body column
    bodyColDiv.appendChild(cardBodyDiv);

    // Second column
    let buttonColDiv = document.createElement('div');
    buttonColDiv.classList.add('col-md-3', 'd-flex', 'flex-column', 'justify-content-center');

    let innerButtonColDiv = document.createElement('div');
    innerButtonColDiv.classList.add('d-flex', 'flex-column', 'align-items-end');
    innerButtonColDiv.style.marginRight = '8px';
    innerButtonColDiv.setAttribute('product-reference-id', productId);

    let stockElement = document.createElement('p');
    stockElement.style.marginBottom = '5px';
    if (stockCount !== 0) {
        stockElement.style.marginRight = '15px';
        stockElement.textContent = `${stockCount} available`;
    } else {
        stockElement.style.marginRight = '10px';
        stockElement.textContent = `Out of stock!`;
    }
    innerButtonColDiv.appendChild(stockElement);

    let addToCartButton = document.createElement('button');
    addToCartButton.classList.add('btn', 'btn-success', 'mb-1');
    addToCartButton.textContent = 'Add to Cart';

    let viewDescriptionButton = document.createElement('button');
    viewDescriptionButton.classList.add('btn', 'btn-outline-primary');
    viewDescriptionButton.textContent = 'View Description';

    addToCartButton.addEventListener('click', () => {
        // Add to cart
    });

    viewDescriptionButton.addEventListener('click', () => {
        // Trigger Modal
    });

    innerButtonColDiv.appendChild(addToCartButton);
    innerButtonColDiv.appendChild(viewDescriptionButton);

    // Append inner button column to button column
    buttonColDiv.appendChild(innerButtonColDiv);

    // Append both columns to the row
    rowDiv.appendChild(bodyColDiv);
    rowDiv.appendChild(buttonColDiv);

    // Append row to the main div
    mainDiv.appendChild(rowDiv);

    // Append main div to the body (or any specific container)
    document.body.appendChild(mainDiv);

}