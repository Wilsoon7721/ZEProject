let params = new URLSearchParams(window.location.search);
let paymentID = params.get('id');
let paymentForm = document.getElementById('payment-type-form');

fetch('/')

document.addEventListener('DOMContentLoaded', () => {
    let params = new URLSearchParams(window.location.search);
    let paymentID = params.get('id');
    let paymentForm = document.getElementById('payment-type-form');

    paymentForm.addEventListener('submit', (event) => {
        event.preventDefault();
        let paymentMode = document.querySelector('input[name="payment-type"]:checked').value;

        // send PUT to payments to update payment status
        // Include request body of `paymentMethod`, `paymentStatus`, `orderID`
    })
});