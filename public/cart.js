document.addEventListener('DOMContentLoaded', () => {
    // Query database here, and obtain JSON {productId (string): quantity (integer)}. Send the pair into renderCartItem()
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
        for(let key in data) {
            let val = data[key];
            renderCartItem(key, val);
        }
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
        console.log(data);
        productTitle.innerText = data.productName;
        cartItemContainer.appendChild(productTitle);

        let buttonDisplay = document.createElement('div');
        buttonDisplay.style.display = 'flex';
        buttonDisplay.style.lineHeight = '5px';
        buttonDisplay.setAttribute('cart-product-id', productId);
        cartItemContainer.appendChild(buttonDisplay);

        let price = document.createElement('p');
        price.style.marginRight = '10px';
        price.style.marginTop = '15px';
        price.innerText = `${purchaseQuantity} × ${data.price} = $${data.price * purchaseQuantity}`;
        buttonDisplay.append(price);

        let qtyInput = document.createElement('input');
        qtyInput.type = 'text';
        qtyInput.placeholder = 'Qty';
        qtyInput.style.width = '35px';
        qtyInput.style.height = '37px';
        qtyInput.style.textAlign = 'center';
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
                let productId = event.target.parentNode.getAttribute('cart-product-id');
                let newValue = qtyInput.value;
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
                let productId = event.target.parentNode.getAttribute('cart-product-id');

            }
            
        });


    });
    // Calculate Price from Quantity
    // Set up event delegation by putting productId in larger container so that changes can be made easily
    // Title should be truncated to prevent it from overlapping buttons. 
    // Build UI elements and append to 'cartItemHolder'
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