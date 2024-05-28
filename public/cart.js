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
        let totalPrice = 0;
        for(let key in data) {
            let val = parseInt(data[key]);
            totalPurchaseQuantity += val;
            totalPrice += renderCartItem(key, val);
        }

        // Upon rendering all cart items, render the final box that summarises and has a pay button.
        let itemContainer = document.createElement('div');
        itemContainer.classList.add('cart-item-container');
        let totalDiv = document.createElement('div');
        let priceTotal = document.createElement('p');
        let itemTotal = document.createElement('p');
        priceTotal.style.margin = "0px";
        itemTotal.style.margin = "0px";
        priceTotal.innerText = `Total Price: $${totalPrice}`;
        itemTotal.innerText = `Total Items: ${totalPurchaseQuantity}`;
        totalDiv.appendChild(priceTotal);
        totalDiv.appendChild(itemTotal);
        let buttonDiv = document.createElement('div');
        let disposeAllButton = document.createElement('button');
        let payButton = document.createElement('button');
        disposeAllButton.id = 'cart-dispose-all-button';
        disposeAllButton.classList.add('btn', 'btn-outline-danger');
        disposeAllButton.innerText = 'Delete All';
        payButton.id = 'cart-payment-button';
        payButton.classList.add('btn', 'btn-outline-success');
        payButton.innerText = `Pay $${totalPrice}`;
        disposeAllButton.addEventListener('click', () => {
            // TODO Clear Cart Button
            // Fetch Cart and Delete One By One
            fetch('/cart', {
                method: 'GET',
                headers: {
                    'X-Internal-Endpoint': 'true'
                }
            })
            .then(async resp => {
                let data = await resp.json();
                for(let id in data) {
                    // id is a string here.
                    let quantity = data[id];
                    fetch(`/cart?id=${id}&quantity=${quantity}`, {
                        method: 'DELETE',
                        headers: {
                            'X-Internal-Endpoint': 'true'
                        }
                    })
                    .then(resp => {
                        if(!resp.ok) {
                            showToast("Failed to Delete All Cart Items", "Some cart items were not deleted.", "images/cross.jpg");
                            return;
                        }
                    });
                }
                showToast("Deleted All Cart Items", "All cart items have been deleted.", null);
                setTimeout(() => window.location.href = '/cart', 2000);
            })
        });

        payButton.addEventListener('click', () => {
            // TODO Pay Button (link to orders table)
        });
        buttonDiv.appendChild(disposeAllButton);
        buttonDiv.appendChild(payButton);
        itemContainer.appendChild(totalDiv);
        itemContainer.appendChild(buttonDiv);
        cartItemHolder.appendChild(itemContainer);
    });
});

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
        price.innerText = `${purchaseQuantity} × $${data.price}/ea = $${totalItemPrice}`;
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
                if(!qtyInputField)
                    return;

                let newValue = qtyInputField.value;
                if(isNaN(newValue)) {
                    showToast("Cannot Update New Quantity", "You need to specify a valid number.", "images/cross.jpg");
                    return;
                }
                // Also have to check stock based on the POST result again.
                if(newValue === 0) {
                    // If the user is planning to update to zero, just simulate the press of the delete button.
                    itemDeleteButton.click();
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
                        showToast('Maximum Quantity Reached', 'You have exceeded the maximum amount purchasable.', 'images/cross.jpg');
                    else
                        showToast('Cart Quantity Changed', 'You have changed the quantity of a product.', null);
                    setTimeout(() => window.location.href = refreshPage, 3000);
                });
                return;
            }
            if(event.target.classList.contains('item-delete-button')) {
                // Delete item from code
                let cartItemContainer = target.closest('[cart-product-id]');
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
                    setTimeout(() => window.location.href = refreshPage, 3000);
                });
            }
        });

        return totalItemPrice;
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