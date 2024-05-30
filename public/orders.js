document.addEventListener('DOMContentLoaded', () => {

});


// orderStatus can be of type `pending`, `shipped`, `delivered`, `cancelled`
// shipmentStatus can be of type 'pending','shipped','in transit','delivered','returned'
function renderUserOrder(orderID, productTitle, purchaseQuantity, unitPrice, orderStatus, shipmentStatus) {
    let sanitizedOrderStatus = orderStatus.trim().toLowerCase();
    let cardHolder = document.getElementById('order-card-holder');
    let colDiv = document.createElement('div');
    let cardDiv = document.createElement('div');
    colDiv.classList.add('col');
    cardDiv.classList.add('card');
    
    let cardHeaderDiv = document.createElement('div');
    let orderStatusElement = document.createElement('p');
    orderStatusElement.style.margin = '0px';
    orderStatusElement.innerText = `Status: ${orderStatus}`;
    cardHeaderDiv.classList.add('card-header');
    cardHeaderDiv.appendChild(orderStatusElement);
    if(sanitizedOrderStatus === 'shipped') {
        let shipmentStatusElement = document.createElement('p');
        shipmentStatusElement.style.margin = '0px';
        shipmentStatusElement.innerText = `Shipment Status: ${shipmentStatus}`;
        cardHeaderDiv.appendChild(shipmentStatusElement);
    }

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
    cardFooter.setAttribute('order-reference-id', orderID); // For event delegation later

    let receivedButton = document.createElement('button');
    let refundButton = document.createElement('button');
    receivedButton.classList.add('btn', 'btn-success');
    refundButton.classList.add('btn', 'btn-danger');
    receivedButton.innerText = "Order Received";
    refundButton.innerText = "Request for Return/Refund";

    // TODO Dynamic buttons
    if(sanitizedOrderStatus === 'pending') {
        // Cancel Button
        let cancelButton = document.createElement('button');
        cancelButton.innerText = "Cancel Order";
        cancelButton.classList.add('btn', 'btn-danger');
        cardFooter.appendChild(cancelButton);
    } else if(sanitizedOrderStatus === 'shipped') {
        // Order Received and Disabled Request for Return/Refund
        refundButton.setAttribute('disabled', 'true');
        cardFooter.appendChild(receivedButton);
        cardFooter.appendChild(refundButton);
    } else if(sanitizedOrderStatus === 'delivered') {
        // Order Received and Request for Return/Refund
        cardFooter.appendChild(receivedButton);
        cardFooter.appendChild(refundButton);
    } else {
        // No buttons (for cancelled)
    }

    cardDiv.appendChild(cardBodyDiv);
    cardDiv.appendChild(cardFooter);
    colDiv.appendChild(cardDiv);

    cardHolder.appendChild(colDiv);
}