const e = require("express");

document.addEventListener('DOMContentLoaded', () => {
    // Obtain user cookie
    let cartItemHolder = document.getElementById('cart-items-holding-container');
    let userID = getUserID();
    
    // Query database here, and obtain JSON {productId (string): quantity (integer)}. 
    // Send the pair into renderCartItem()
    fetch('/cart', {
        method: 'GET',
        headers: {
            'X-Internal-Endpoint': 'true'
        }
    })
    .then(async resp => {
        if(!resp.ok) {
            console.error("Failed to load cart data.");
            return;
        }
        let data = await resp.json();
        let totalPurchaseQuantity = 0;
        for(let key in data) {
            let val = parseInt(data[key]);
            totalPurchaseQuantity += val;
            renderCartItem(key, val);
        }

        // Give about 0.5 - 5 seconds before rendering the final box that summarises and has a pay button.
        // For loop continues upon executing renderCartItem(), but doesn't wait for that to complete.
        
        // Explain: Because the for loop doesn't wait for renderCartItem() to finish, the pay button will appear before
        // the cart items, which is not what we want. As such, we introduce a small delay to prevent the box from appearing too early.
        setTimeout(() => {
            let itemContainer = document.createElement('div');
            itemContainer.classList.add('cart-item-container');
            itemContainer.style.border = "1.25px solid #8B8000";
            let totalDiv = document.createElement('div');
            let priceTotal = document.createElement('p');
            let itemTotal = document.createElement('p');
            priceTotal.style.margin = "0px";
            itemTotal.style.margin = "0px";
            itemTotal.innerText = `Total Items: ${totalPurchaseQuantity}`;
            totalDiv.appendChild(priceTotal);
            totalDiv.appendChild(itemTotal);
            let buttonDiv = document.createElement('div');
            let disposeAllButton = document.createElement('button');
            let payButton = document.createElement('button');
            disposeAllButton.id = 'cart-dispose-all-button';
            disposeAllButton.classList.add('btn', 'btn-outline-danger');
            disposeAllButton.innerText = 'Delete All';
            disposeAllButton.style.marginRight = '15px';
            payButton.id = 'cart-payment-button';
            payButton.classList.add('btn', 'btn-outline-success');
            fetch('/cart', {
                method: 'GET',
                headers: {
                    'X-Internal-Endpoint': 'true',
                    'X-Return-Price-Only': 'true'
                }
            })
            .then(async resp => {
                if(!resp.ok) {
                    console.error("Failed to retrieve total price.");
                    return;
                }
                let data = await resp.json();
                let totalPrice = parseFloat(data.price)
                if(totalPrice === 0) {
                    // Price is empty, either the item is free or there is nothing.
                    disposeAllButton.classList.add('disabled');
                    if(totalPurchaseQuantity === 0)
                        // Truly nothing in the cart
                        payButton.classList.add('disabled');
                    payButton.innerText = 'Pay $0.00';
                } else {
                    priceTotal.innerText = `Total Price: $${totalPrice.toFixed(2)}`;
                    payButton.innerText = `Pay $${totalPrice.toFixed(2)}`;
                }
            });

            disposeAllButton.addEventListener('click', () => {
                // Send DELETE to cart and add custom header to delete the entire cart regardless of id and quantity.
                fetch(`/cart`, {
                    method: 'DELETE',
                    headers: {
                       'X-Internal-Endpoint': 'true',
                       'X-Wipe-Cart': 'true'
                    },
                }).then(resp => {
                    if(!resp.ok) {
                        showToast("Failed to Delete All Cart Items", "Some cart items were not deleted.", "images/cross.jpg");
                        return;
                    }
                });
                showToast("Deleted All Cart Items", "All cart items have been deleted.", null);
                setTimeout(() => window.location.href = '/cart', 2000);
            });
            let commonHeaders = {
                'Content-Type': 'application/json',
                'X-Internal-Endpoint': 'true'
            };
            payButton.addEventListener('click', () => {
                // TODO Pay Button
                // Create entry in payments table
                // Redirect to GET payments
                
                // Fetch order_id first to retrieve next Order ID
                // Fetch cart  to retrieve productIDs and quantities
                // Then post to orders to obtain orderID
                // Then post to payments to obtain paymentID
                // Kickoff by sending paymentID to /pay.

                let orderID;
                getNextOrderID().then(id => orderID = id);
                fetch('/cart', {
                    method: 'GET',
                    headers: commonHeaders
                })
                .then(async resp => {
                    let cart = await resp.json();
                    
                });
            });
            buttonDiv.appendChild(disposeAllButton);
            buttonDiv.appendChild(payButton);
            itemContainer.appendChild(totalDiv);
            itemContainer.appendChild(buttonDiv);
            cartItemHolder.appendChild(itemContainer);
        }, 500);
    });
});

async function getNextOrderID() {
    try {
        let resp = await fetch('/order_id', {
            method: 'GET',
            headers: commonHeaders
        });    
        if(!resp.ok) {
            console.error(`Failed to obtain the next order ID: HTTP response code ${resp.status()} received.`);
            return;
        }
        let data = await resp.json();
        return data.id;
    } catch(error) {
        console.error("Failed to obtain the next order ID.\n", error);
    }
}

const ITEM_TITLE_MAX_CHARS = 16;
function renderCartItem(productId, purchaseQuantity) {
    let cartItemHolder = document.getElementById('cart-items-holding-container');
    // Fetch product by ID
    fetch(`/products/${productId}`, {
        method: 'GET',
        headers: {
            'X-Internal-Endpoint': 'true'
        }
    })
    .then(async resp => {
        if(!resp.ok) {
            console.error("Render Cart Item failed: Could not obtain a successful response when retrieving product.");
            return;
        }
        let data = await resp.json();
        data = data[0]; // Get first entry from results
        let cartItemContainer = document.createElement('div');
        cartItemContainer.classList.add('cart-item-container');
        let productTitle = document.createElement('div');
        productTitle.style.textAlign = 'left';
        productTitle.innerText = data.productName;
        cartItemContainer.appendChild(productTitle);

        let buttonDisplay = document.createElement('div');
        buttonDisplay.style.display = 'flex';
        buttonDisplay.style.lineHeight = '5px';
        buttonDisplay.setAttribute('cart-product-id', productId);
        cartItemContainer.appendChild(buttonDisplay);

        let price = document.createElement('p');
        let totalItemPrice = data.price * purchaseQuantity;
        price.style.marginRight = '10px';
        price.style.marginTop = '15px';
        price.innerText = `${purchaseQuantity} × $${parseFloat(data.price).toFixed(2)}/ea = $${parseFloat(totalItemPrice).toFixed(2)}`;
        buttonDisplay.append(price);

        let qtyInput = document.createElement('input');
        qtyInput.type = 'text';
        qtyInput.placeholder = 'Qty';
        qtyInput.style.width = '35px';
        qtyInput.style.height = '37px';
        qtyInput.style.textAlign = 'center';
        // Custom class for event delegation
        qtyInput.classList.add('qty-input');
        qtyInput.value = purchaseQuantity;
        buttonDisplay.append(qtyInput);

        let updateQtyButton = document.createElement('button');
        updateQtyButton.title = 'Update Quantity';
        updateQtyButton.classList.add('btn', 'btn-outline-warning', 'bi', 'bi-arrow-repeat', 'qty-update-button');
        buttonDisplay.append(updateQtyButton);

        let itemDeleteButton = document.createElement('button');
        itemDeleteButton.title = 'Delete From Cart';
        itemDeleteButton.classList.add('btn', 'btn-outline-danger', 'bi', 'bi-trash', 'item-delete-button');
        buttonDisplay.append(itemDeleteButton);

        cartItemHolder.appendChild(cartItemContainer);

        document.addEventListener('click', (event) => {
            if(!event.target)
                return;
            if(event.target.classList.contains('qty-update-button')) {
                let cartItemContainer = event.target.closest('[cart-product-id]');
                if(!cartItemContainer)
                    return;
                let productId = cartItemContainer.getAttribute('cart-product-id');
                let qtyInputField = cartItemContainer.querySelector('.qty-input');
                let delButton = cartItemContainer.querySelector('.item-delete-button');
                if(!qtyInputField)
                    return;

                let newValue = parseInt(qtyInputField.value);
                if(isNaN(newValue)) {
                    showToast("Cannot Update New Quantity", "You need to specify a valid number.", "images/cross.jpg");
                    return;
                }
                if(newValue === 0) {
                    // If the user is planning to update to zero, just simulate the press of the delete button.
                    delButton.click();
                    return;
                }
                fetch('/cart', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Internal-Endpoint': 'true'
                    },
                    body: JSON.stringify({
                        id: productId,
                        amount: newValue
                    })
                })
                .then(async resp => {
                    let refreshPage = window.location.href;
                    if(resp.status === 409)
                        showToast('Maximum Quantity Reached', 'You have exceeded the maximum amount purchasable. Quantity has been set to maximum available.', 'images/cross.jpg');
                    else
                        showToast('Cart Quantity Changed', 'You have changed the quantity of a product.', null);
                    setTimeout(() => window.location.href = refreshPage, 1500);
                });
                return;
            }
            if(event.target.classList.contains('item-delete-button')) {
                // Delete item from code
                let cartItemContainer = event.target.closest('[cart-product-id]');
                if(!cartItemContainer)
                    return;

                let productId = cartItemContainer.getAttribute('cart-product-id');
                fetch(`/cart?id=${productId}&quantity=all`, {
                    method: 'DELETE',
                    headers: {
                        'X-Internal-Endpoint': 'true'
                    }
                })
                .then(async resp => {
                    let refreshPage = window.location.href;
                    if(!resp.ok) {
                        showToast("Item Not Deleted", "An error occurred while trying to delete this item.", "images/cross.jpg");
                        return;
                    }
                    let data = await resp.json();
                    showToast("Item Deleted", data.message, null);
                    // Refresh Page
                    setTimeout(() => window.location.href = refreshPage, 1500);
                });
            }
        });
    });
}

function showToast(toastTitle, toastContent, toastImage) {
    let containerElement = document.getElementById('toast-surrounding-container');
    let titleElement = document.getElementById("cart-toast-title");
    let imageElement = document.getElementById("cart-toast-image");
    let bodyElement = document.getElementById('cart-toast-message');
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