document.addEventListener('DOMContentLoaded', () => {
    // Handle switcher buttons (login/register)
    let switchToLoginButton = document.getElementById('switch-login-button');
    let switchToRegisterButton = document.getElementById('switch-register-button');

    let msgDisplayId = 'login-msg-display';
    let msgDisplay = document.getElementById(msgDisplayId);
    let loginFormContainer = document.getElementById('login-form-container');
    let registerFormContainer = document.getElementById('register-form-container');
    // Display Login Form first.
    registerFormContainer.setAttribute('hidden', 'true');
    loginFormContainer.removeAttribute('hidden');
    
    // Set Switcher Click Events
    switchToLoginButton.addEventListener('click', () => {
        registerFormContainer.setAttribute('hidden', 'true');
        loginFormContainer.removeAttribute('hidden');
        msgDisplayId = 'login-msg-display';
        msgDisplay = document.getElementById(msgDisplayId);
    });
    switchToRegisterButton.addEventListener('click', () => {
        loginFormContainer.setAttribute('hidden', 'true');
        registerFormContainer.removeAttribute('hidden');
        msgDisplayId = 'register-msg-display';
        msgDisplay = document.getElementById(msgDisplayId);
    });

    // Set Form Submission Behaviours
    let loginForm = document.getElementById('login-form');
    let registerForm = document.getElementById('register-form');
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        let loginEmail = document.getElementById('login-user_email_input').value;
        let loginPassword = document.getElementById('login-user_password_input').value;
        let loginRemember = document.getElementById('login-remember').checked;
        // Do not need to check for missing values because 'required' atrribute active

        fetch('/users', {
            method: 'GET',
            headers: {
                'X-Internal-Endpoint': 'true',
                // Use headers because GET requests cannot have body
                'X-Email': loginEmail,
                'X-Password': loginPassword,
                'X-RememberUser': loginRemember
            }
        })
        .then(async resp => {
            let data = await resp.json();
            if(!resp.ok) {
                msgDisplay.style.border = '1.75px solid red';
                msgDisplay.style.color = '#FF7F7F';
                msgDisplay.textContent = `Error: ${data.message}`;
                msgDisplay.style.display = 'block';
                setTimeout(() => msgDisplay.style.display = 'none', 3000);
            } else {
                msgDisplay.style.border = '1.75px solid #013220';
                msgDisplay.style.color = 'green';
                msgDisplay.textContent = `Welcome ${data.identity}! Redirecting...`;
                msgDisplay.style.display = 'block';
                setTimeout(() => window.location.href = '/', 2000);
            }
        });
    });
    let registerUsernameElement = document.getElementById('register-username-input');
    let usernameVerification = document.getElementById('username-verification');
    let usernameInputIdleCheck;
    registerUsernameElement.addEventListener('input', () => {
        clearTimeout(usernameInputIdleCheck);
        if(registerUsernameElement.value === "") {
            usernameVerification.innerText = "";
            return;
        }
        usernameVerification.innerText = "Checking...";
        usernameVerification.style.color = "gray";
        usernameInputIdleCheck = setTimeout(() => {
            let username = registerUsernameElement.value;
            let body = JSON.stringify({
                username: username
            });
            fetch('/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Endpoint': 'true',
                    'X-Verify-Username-Only': 'true'
                },
                body: body
            })
            .then(async resp => {
                let data = await resp.json();
                usernameVerification.innerText = data.message;
                if(!resp.ok)
                    usernameVerification.style.color = "red";
                else
                    usernameVerification.style.color = "green";
            });
        }, 3000);
    });
    registerForm.addEventListener('submit', (event) => {
        event.preventDefault();
        let registerFullName = document.getElementById('register-fullname-input').value;
        let registerUsername = registerUsernameElement.value;
        let registerEmail = document.getElementById('register-email-input').value;
        let registerPassword = document.getElementById('register-password-input').value;
        let registerType = String(document.querySelector('input[name="reg-userType"]:checked').getAttribute('value')).trim().toLowerCase(); // Will be 'buyer' or 'seller'

        let body = JSON.stringify({
            fullname: registerFullName,
            username: registerUsername,
            email: registerEmail,
            password: registerPassword,
            type: registerType
        });
        
        fetch('/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Endpoint': 'true'
            },
            body: body
        }).then(async resp => {
            let data = await resp.json();
            if(!resp.ok) {
                msgDisplay.style.border = '1.75px solid red';
                msgDisplay.style.color = '#FF7F7F';
                msgDisplay.textContent = `Error: ${data.message}`;
                msgDisplay.style.display = 'block';
                setTimeout(() => msgDisplay.style.display = 'none', 3000);
            } else {
                msgDisplay.style.border = '1.75px solid #013220';
                msgDisplay.style.color = 'green';
                msgDisplay.textContent = `Registration complete! Redirecting...`;
                msgDisplay.style.display = 'block';
                setTimeout(() => window.location.href = '/', 2000);
            }
        });
    });
});