const mysql = require('mysql');
const path = require('path');
const express = require('express');

const app = express();

// Configuration
const WEB_SERVER_PORT = 3000;
const SQL_HOST = "localhost";
const SQL_PORT = 3306;
const SQL_USER = "root";
const SQL_PASSWORD = "root";
const SQL_DATABASE = "tradeplatform";

app.use(express.static(path.join(__dirname, 'public'))); // Tells Express to serve static files (e.g. images, css, client-side JS files) from public folder.
app.use(express.json()) // Tells Express to parse JSON request bodies when they come.
app.use(express.urlencoded({ extended: true })); // Tells Express to parse form-data request bodies when they come.

// Utility Functions
function buildSqlConnection() {
    return mysql.createConnection({
        host: SQL_HOST, 
        port: SQL_PORT,
        user: SQL_USER,
        password: SQL_PASSWORD,
        database: SQL_DATABASE
    });
}

function getHTMLFile(fileName) {
    return path.join(__dirname, 'templates', fileName);
}

// Routes

app.get('/', (req, res) => {
    res.sendFile(getHTMLFile('index.html'));
});


let sqlConnection = buildSqlConnection();

sqlConnection.connect(error => {
    if(error) {
        console.error("Database connection failed!\n", error);
        return;
    }
    console.log("Database connected!");
});
app.listen(WEB_SERVER_PORT, () => console.log(`Web server is running on port ${WEB_SERVER_PORT}.`));
