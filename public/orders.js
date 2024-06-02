document.addEventListener('DOMContentLoaded', () => {
    let userID = getUserID();
    fetch(`/orders/${userID}`, {
        method: 'GET',
        headers: {
            'X-Internal-Endpoint': 'true'
        }
    })
    .then(async resp => {
        if(!resp.ok) {
            showToast("Orders Not Loaded", "Your orders could not be loaded.", "images/cross.jpg");
            return;
        }
        let results = await resp.json();
        for(let data of results) {
            let orderID = parseInt(data.orderID);
            let productID = parseInt(data.productID);
            let quantity = parseInt(data.quantity);
            let orderStatus = data.orderStatus;
            let shipmentStatus = data.shipmentStatus;
            fetch(`/payments`, {
                method: 'GET',
                headers: {
                    'X-Internal-Endpoint': 'true',
                    'X-Order-ID': orderID
                }
            })
            .then(async resp => {
                if(!resp.ok) {
                    console.error("Failed to retrieve payment status.");
                    showToast("An error occurred", "Some data could not be displayed here.", 'images/cross.jpg');
                    return;
                }
                let data = (await resp.json())[0];
                let paymentStatus = data.paymentStatus.trim().toLowerCase();
                renderUserOrder(orderID, productID, quantity, orderStatus, shipmentStatus, paymentStatus);
            })
        }
    });
});


// orderStatus can be of type `pending`, `shipped`, `delivered`, `cancelled`
// shipmentStatus can be of type 'pending','shipped','in transit','delivered','returned'
function renderUserOrder(orderID, productID, purchaseQuantity, orderStatus, shipmentStatus, paymentStatus) {
    orderStatus = orderStatus.trim().toLowerCase();

    fetch(`/products/${productID}`, {
        method: 'GET',
        headers: {
            'X-Internal-Endpoint': 'true'
        }
    })
    .then(async resp => {
        if(!resp.ok) {
            console.error("Failed to render order. Product could not be retrieved.");
            showToast("An error occurred", "Some data could not be displayed here.", 'images/cross.jpg');
            return;
        }
        let data = (await resp.json())[0]
        let productTitle = data.productName;
        let unitPrice = parseFloat(data.price);
        let sellerID = parseInt(data.sellerID);
        
        let cardHolder = document.getElementById('order-card-holder');
        let colDiv = document.createElement('div');
        let cardDiv = document.createElement('div');
        colDiv.classList.add('col');
        cardDiv.classList.add('card');
        
        let cardHeaderDiv = document.createElement('div');
        let sellerElement = document.createElement('p');
        let orderStatusElement = document.createElement('p');
        sellerElement.style.margin = '0px';
        sellerElement.style.fontWeight = 'bold';
        sellerElement.style.fontSize = '15px';
        fetch(`/users/${sellerID}`, {
            method: 'GET',
            headers: {
                'X-Internal-Endpoint': 'true'
            }
        }).then(async resp => {
            if(!resp.ok) {
                console.error("Failed to populate seller username.");
                showToast("An error occurred", "Some data could not be displayed here.", 'images/cross.jpg');
                return;
            }
            let data = (await resp.json())[0];
            sellerElement.innerText = data.username;
        });
        cardHeaderDiv.appendChild(sellerElement);
        orderStatusElement.style.margin = '0px';
        orderStatusElement.style.color = 'green';
        let status;
        if(orderStatus === 'pending') {
            if(paymentStatus === 'pending') {
                status = "Awaiting payment";
                orderStatusElement.style.color = 'darkgoldenrod';
            } else
                status = "Waiting for seller to ship your order";
        } else if(orderStatus === 'shipped') {
            status = "Your order has been shipped";
        } else if(orderStatus === 'delivered') {
            status = "Your order has been delivered";
        } else if(orderStatus === 'completed') {
            status = "Order completed";
        } else {
            status = "Order cancelled. ";
            if(paymentStatus === 'refunded')
                status += "Refund has been processed.";
            else 
                status += "Contact support for refund.";
            orderStatusElement.style.color = 'red';
        }
        orderStatusElement.innerText = status;
        cardHeaderDiv.classList.add('card-header');
        cardHeaderDiv.appendChild(orderStatusElement);
        if(orderStatus === 'shipped')
            orderStatusElement.innerText += ` - ${shipmentStatus}`;

        cardDiv.appendChild(cardHeaderDiv);

        let cardBodyDiv = document.createElement('div');
        let cardTitle = document.createElement('h5');
        cardBodyDiv.classList.add('card-body');
        cardTitle.innerText = productTitle;
        cardTitle.classList.add('card-title');
        cardBodyDiv.appendChild(cardTitle);

        let totalPrice = purchaseQuantity * unitPrice;
        let qtyUnitElement = document.createElement('p');
        let totalPriceElement = document.createElement('p');
        qtyUnitElement.classList.add('card-text');
        totalPriceElement.classList.add('card-text');
        qtyUnitElement.style.fontSize = '16px';
        totalPriceElement.style.fontSize = '16px';

        qtyUnitElement.textContent = `Purchased ${purchaseQuantity} at $${unitPrice.toFixed(2)}/ea`;
        totalPriceElement.textContent = `Total Price: $${totalPrice.toFixed(2)}`
        cardBodyDiv.appendChild(qtyUnitElement);
        cardBodyDiv.appendChild(document.createElement('hr'));
        cardBodyDiv.appendChild(totalPriceElement);

        let cardFooter = document.createElement('div');
        cardFooter.classList.add('card-footer');
        cardFooter.setAttribute('order-reference-id', orderID); // For event delegation
        cardFooter.setAttribute('product-reference-id', productID); // For event delegation 

        let receivedButton = document.createElement('button');
        let refundButton = document.createElement('button');
        receivedButton.classList.add('btn', 'btn-success');
        refundButton.classList.add('btn', 'btn-danger');
        receivedButton.innerText = "Order Received";
        refundButton.innerText = "Request for Return/Refund";
        refundButton.style.marginLeft = '10px';
        receivedButton.addEventListener('click', () => {
            let orderId = receivedButton.parentNode.getAttribute('order-reference-id');
            let productId = receivedButton.parentNode.getAttribute('product-reference-id');
            // When seller starts shipping the product, deduct from the stock count in products table
            fetch('/orders', {
                method: 'PUT',
                headers: {
                    'X-Internal-Endpoint': 'true',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orderID: orderId,
                    productID: productId,
                    orderStatus: 'completed'
                })
            })
            .then(resp => {
                if(!resp.ok) {
                    console.error("Failed to mark order as completed.");
                    return;
                }
                showToast("Order Received", "Enjoy your purchase!", null);
                setTimeout(() => window.location.href = "/orders", 1500);
            });
        });
        refundButton.addEventListener('click', () => {
            let orderId = refundButton.parentNode.getAttribute('order-reference-id');
            let productId = refundButton.parentNode.getAttribute('product-reference-id');
            fetch('/orders', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Endpoint': 'true'
                },
                body: JSON.stringify({
                    orderID: orderId,
                    productID: productId,
                    orderStatus: "cancelled"  
                })
            })
            .then(resp => {
                if(!resp.ok) {
                    console.error("Failed to update order state.");
                    return;
                }
                showToast("Order Cancelled", "You need to schedule a return with the seller for this order before a refund is processed.", null);
                setTimeout(() => window.location.href = "/orders", 3000);
            });
        });

        let renderFooter = true;
        if(orderStatus === 'pending') {
            let cancelButton = document.createElement('button');

            if(paymentStatus === 'pending') {
                let payButton = document.createElement('button');
                payButton.innerText = "Make Payment";
                payButton.classList.add('btn', 'btn-success');
                payButton.addEventListener('click', () => {
                    let orderId = payButton.parentNode.getAttribute('order-reference-id');
                    fetch('/payments', {
                        method: 'GET',
                        headers: {
                            'X-Internal-Endpoint': 'true',
                            'X-Order-ID': orderId
                        }
                    })
                    .then(async resp => {
                        if(!resp.ok) {
                            showToast("Cannot Redirect", "We could not redirect you to the payment page.", "images/cross.jpg");
                            return;
                        }
                        let data = (await resp.json())[0];
                        window.location.href = `/pay?id=${data.paymentID}&redirect=true`;
                    });
                });
                cardFooter.appendChild(payButton);
                cancelButton.style.marginLeft = '10px';
            }
            
            cancelButton.innerText = "Cancel Order";
            cancelButton.classList.add('btn', 'btn-danger');
            cancelButton.addEventListener('click', () => {
                let orderId = cancelButton.parentNode.getAttribute('order-reference-id');
                let productId = cancelButton.parentNode.getAttribute('product-reference-id');
                fetch('/orders', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Internal-Endpoint': 'true'
                    },
                    body: JSON.stringify({
                        orderID: orderId,
                        productID: productId,
                        orderStatus: "cancelled"  
                    })
                })
                .then(resp => {
                    if(!resp.ok) {
                        console.error("Failed to update order state.");
                        return;
                    }
                    // Update payment to refunded
                    fetch('/custom_query', {
                        method: 'GET',
                        headers: {
                            'X-Internal-Endpoint': 'true',
                            'X-SQL-Query': `UPDATE payments SET paymentStatus = "refunded" WHERE orderID = ${orderId}`
                        }
                    })
                    .then(resp => {
                        if(!resp.ok) {
                            console.error("Failed to update payment to refunded after cancellation.");   
                            setTimeout(() => window.location.href = "/orders", 1500);
                            showToast("Order Cancelled", "You have cancelled this order. However, your payment could not be refunded.", "images/cross.jpg");
                            return;                        
                        }
                        setTimeout(() => window.location.href = "/orders", 1500);
                        showToast("Order Cancelled", "You have cancelled this order. Your payment has been refunded.");
                    })
                });
            });
            cardFooter.appendChild(cancelButton);
        } else if(orderStatus === 'shipped') {
            // Order Received and Disabled Request for Return/Refund
            refundButton.setAttribute('disabled', 'true');
            cardFooter.appendChild(receivedButton);
            cardFooter.appendChild(refundButton);
        } else if(orderStatus === 'delivered') {
            // Order Received and Request for Return/Refund
            cardFooter.appendChild(receivedButton);
            cardFooter.appendChild(refundButton);
        } else {
            // No buttons (for completed and cancelled), prevent the footer from rendering
            renderFooter = false;
        }

        cardDiv.appendChild(cardBodyDiv);
        if(renderFooter)
            cardDiv.appendChild(cardFooter);
        colDiv.appendChild(cardDiv);

        cardHolder.appendChild(colDiv);
    });
}

function showToast(toastTitle, toastContent, toastImage) {
    let containerElement = document.getElementById('toast-surrounding-container');
    let titleElement = document.getElementById("orders-toast-title");
    let imageElement = document.getElementById("orders-toast-image");
    let bodyElement = document.getElementById('orders-toast-message');
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