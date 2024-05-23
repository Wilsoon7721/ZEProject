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
        
        let body = JSON.stringify({
            email: loginEmail,
            password: loginPassword,
            remember: loginRemember
        });

        fetch('/users', {
            method: 'GET',
            headers: {
                'X-Internal-Endpoint': 'true'
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
                msgDisplay.textContent = "Login success! Redirecting...";
                msgDisplay.style.display = 'block';
            }
        });
    });
    registerForm.addEventListener('submit', (event) => {
        event.preventDefault();
        let userType = document.querySelector('input[name="userType"]:checked');
    });
});