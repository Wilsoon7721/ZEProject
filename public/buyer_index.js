document.addEventListener("DOMContentLoaded", () => {
    // Align Header and Login Matters done by injector.js

    // Handle product listings
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
        for(let i = 0; i < results.length; i++) {
            let productId = results[i].productID;
            let sellerId = results[i].sellerID;
            let productName = results[i].productName;
            let productDescription = results[i].productDescription;
            let price = results[i].price;
            let stockCount = parseInt(results[i].quantity);
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
                fetch('/custom_query', {
                    method: 'GET',
                    headers: {
                        'X-Internal-Endpoint': 'true',
                        'X-SQL-Query': `SELECT * FROM orders WHERE productID = ${productId}`
                    }
                })
                .then(async resp => {
                    if(!resp.ok) {
                        console.error("Render Product Failed! Could not obtain existing orders with the product ID.");
                        return;
                    }
                    // Adjusts the stock count to account for orders that are PENDING or SHIPPED (deducts the stock count)
                    // If the order is cancelled, the original quantity restores
                    // If the order is delivered, the actual quantity should be reflected in the products table.
                    let results = await resp.json();
                    let usedQuantity = 0;
                    let adjustedStock = stockCount
                    if(results.length !== 0) {
                        for(let result of results) {
                            let orderStatus = result.orderStatus;
                            let orderQuantity = parseInt(result.quantity);
                            if(orderStatus === 'pending' || orderStatus === 'shipped')
                                usedQuantity += orderQuantity
                        }
                        adjustedStock -= usedQuantity; 
                    }
                    renderProductInfo(productId, productName, productDescription, price, adjustedStock, sellerName, days);
                });
            }); 
        }
    })

    // Also use timeout to modify the remaining stock in the productInfo
    setTimeout(() => {
        // Handle products in cart
        fetch('/cart', {
            method: 'GET',
            headers: {
                'X-Internal-Endpoint': 'true'
            }
        })
        .then(async resp => {
            let data = await resp.json();
            for(let productId in data) {
                let cartQuantity = data[productId];
                let productDiv = document.querySelector(`[product-reference-id="${productId}"]`);
                let stockAvailableElement = productDiv.querySelector('.stock-available-count');
                let addToCartButton = productDiv.querySelector('.add-to-cart-button');
                let originalStock = parseInt(stockAvailableElement.textContent.split(" ")[0]);
                let stockRemaining = originalStock - cartQuantity;
                if(stockRemaining <= 0) {
                    stockAvailableElement.textContent = `0 available ◦ In your cart`;
                    addToCartButton.classList.add('disabled');
                } else {
                    stockAvailableElement.textContent = `${stockRemaining} available ◦ In your cart`;
                }
            }
        });
    }, 500);
});

// Truncates Description if it exceeds this amount of characters.
const DESC_MAX_CHARACTERS = 250;
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
    stockElement.classList.add('stock-available-count');
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
    addToCartButton.classList.add('btn', 'btn-success', 'mb-1', 'add-to-cart-button');
    if(stockCount === 0)
        addToCartButton.classList.add('disabled');
    addToCartButton.textContent = 'Add to Cart';

    let viewDescriptionButton = document.createElement('button');
    viewDescriptionButton.classList.add('btn', 'btn-outline-primary');
    viewDescriptionButton.textContent = 'View Description';
    
    let cartItemsCount = document.getElementById('user-cart-item-count');
    
    addToCartButton.addEventListener('click', () => {
        // Add to cart
        let productId = parseInt(addToCartButton.parentNode.getAttribute('product-reference-id'));
        if(getUserID() === -1) {
            window.location.href = '/auth';
            return;
        }
        fetch('/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Endpoint': 'true'
            },
            body: JSON.stringify({
                id: productId
            })
        })
        .then(async resp => {
            let data = await resp.json();
            let size = parseInt(data.newSize);
            if(resp.status === 409) {
                showToast("Could Not Add Item", `${data.message}`, 'images/cross.jpg');
                cartItemsCount.innerText = size;
                return;
            } else if(!resp.ok) {
                showToast("Cart Not Updated", "Could not add this item to cart.", "images/cross.jpg");
                return; 
            } else {
                showToast("Cart Updated", `${data.message}`, null);
                let itemStockCountElement = addToCartButton.parentNode.querySelector('.stock-available-count');
                let oldStock = parseInt(itemStockCountElement.textContent.split(" ")[0]);
                if(oldStock - 1 <= 0) {
                    // Disable if no more stock
                    addToCartButton.classList.add('disabled');
                    itemStockCountElement.textContent = `0 available ◦ In your cart`;
                } else {
                    itemStockCountElement.textContent = `${oldStock - 1} available ◦ In your cart`;
                }
                cartItemsCount.innerText = size;
            }
        });
    });

    viewDescriptionButton.addEventListener('click', () => {
        let productId = parseInt(viewDescriptionButton.parentNode.getAttribute('product-reference-id'));
        showProductDescriptionModal(productId);
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

function showToast(toastTitle, toastContent, toastImage) {
    let containerElement = document.getElementById('toast-surrounding-container');
    let titleElement = document.getElementById("buyerhome-toast-title");
    let imageElement = document.getElementById("buyerhome-toast-image");
    let bodyElement = document.getElementById('buyerhome-toast-message');
    containerElement.style = "";
    imageElement.src = toastImage || "images/checkmark.png";
    titleElement.innerText = toastTitle;
    
    let toastElement = document.querySelector('.toast');
    let toast = new bootstrap.Toast(toastElement);
    bodyElement.textContent = toastContent;
    toast.show();

    // Fully hide display, prevents invisible overlapping of buttons
    const hideToastBox = () => setTimeout(() => containerElement.style.display = 'none', 1000);
    toastElement.removeEventListener('hidden.bs.toast', hideToastBox);
    toastElement.addEventListener('hidden.bs.toast', hideToastBox);

}

function showProductDescriptionModal(productId) {
    let modalElement = document.getElementById('descriptionModal');
    let modalTitle = document.getElementById('description-modal-title');
    let modalDescription = document.getElementById('description-modal-body');
    let modalStockPriceTag = document.getElementById('stock-count-price-tag');

    let bsModal = bootstrap.Modal.getInstance(modalElement);
    if(!bsModal)
        bsModal = new bootstrap.Modal(modalElement);
    // Fetch product, populate and show
    fetch(`/products/${productId}`, {
        method: 'GET',
        headers: {
            'X-Internal-Endpoint': 'true'
        }
    })
    .then(async resp => {
        if(!resp.ok) {
            showToast("Failed to fetch", "The information for this product could not be retrieved.", "images/cross.jpg");
            return;
        }
        let data = (await resp.json())[0];
        modalTitle.textContent = data.productName;
        modalDescription.textContent = data.productDescription;
        fetch('/cart', {
            method: 'GET',
            headers: {
                'X-Internal-Endpoint': 'true'
            }
        })
        .then(async resp => {
            let cart = await resp.json();
            // productId is a string because its obtained from `product-reference-id` attribute

            let usedQuantity = 0;
            fetch('/custom_query', {
                method: 'GET',
                headers: {
                    'X-Internal-Endpoint': 'true',
                    'X-SQL-Query': `SELECT * FROM orders WHERE productID = ${productId}`
                }
            })
            .then(async resp => {
                if(!resp.ok) {
                    console.error("Render Product Failed! Could not obtain existing orders with the product ID.");
                    return;
                }
                let results = await resp.json();
                if(results.length !== 0) {
                    for(let result of results) {
                        let orderStatus = result.orderStatus;
                        let orderQuantity = parseInt(result.quantity);
                        if(orderStatus === 'pending' || orderStatus === 'shipped')
                            usedQuantity += orderQuantity
                    } 
                }
                let totalStock = parseInt(data.quantity);
                if(productId in cart) {
                    let qtyInCart = parseInt(cart[productId]);
                    modalStockPriceTag.textContent = `${(totalStock - qtyInCart - usedQuantity)} available ◦ ${qtyInCart} in cart ◦ $${data.price}/ea`
                } else {
                    modalStockPriceTag.textContent = `${totalStock - usedQuantity} available ◦ $${data.price}/ea`;
                }
                bsModal.show();
            });
        });
    });
}