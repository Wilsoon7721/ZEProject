document.addEventListener("DOMContentLoaded", () => {
    // Align header first
    let barHeight = document.querySelector('.navbar').offsetHeight;
    let pageTitle = document.getElementById("page-title");
    pageTitle.style.marginTop = `${barHeight + 10}px`;

    // Settle Login Matters
    let userID = getUserID();
    if(userID !== -1) {
        // User ID does not return empty
    }
});