document.addEventListener('DOMContentLoaded', () => {
    let paymentForm = document.getElementById('payment-type-form');
    let submitButton = document.getElementById('submit-button');
    let params = new URLSearchParams(window.location.search);   
    let paymentID = params.get('id');
    if(!paymentID) {
        window.location.href = '/';
    }
    fetch('/payments', {
        method: 'GET',
        headers: {
            'X-Internal-Endpoint': 'true',
            'X-Payment-ID': paymentID
        }
    })
    .then(async resp => {
        let result = (await resp.json())[0];
        let amount = parseFloat(result.amount);
        submitButton.value = `Pay $${amount.toFixed(2)}`;
    });
    
    paymentForm.addEventListener('submit', (event) => {
        event.preventDefault();
        submitButton.setAttribute('disabled', 'true');
        let paymentMode = document.querySelector('input[name="payment-type"]:checked').value;
        console.log(paymentMode);
        // Actual Payment Logic goes here. However, we will just complete it immediately for this example.

        // Send PUT to payments to update payment status. Include request body of `paymentMethod`, `paymentStatus`
        fetch(`/payments/${paymentID}`, {
            method: 'PUT',
            headers: {
                'X-Internal-Endpoint': 'true',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paymentMethod: paymentMode,
                paymentStatus: 'completed'
            })
        })
        .then(resp => {
            // Disable the button so multiple requests aren't made.
            if(!resp.ok) {
                submitButton.value = "Payment Failed";
                submitButton.style.backgroundColor = 'red';
                setTimeout(() => {
                    submitButton.value = `Pay $${amount.toFixed(2)}`;
                    submitButton.removeAttribute('disabled')
                }, 1500);
                return;
            }
            submitButton.value = "Payment Success!";
            fetch('/cart', {
                method: "DELETE",
                headers: {
                    'X-Internal-Endpoint': 'true',
                    'X-Wipe-Cart': 'true'
                }
            })
            .then(resp => {
                if(!resp.ok) {
                    console.error("Failed to delete user's cart.");
                    return;
                }
            });
            setTimeout(() => window.location.href = '/orders', 1500);
        });
        // Clear cart after payment completes.
    })
});