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

// How long should the server remember you when you login if `Remember?` is checked? 
// Set the first value in minutes. Example shown is 5 minutes.
const REMEMBER_DURATION = 5 * 60000

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

const verifyInternal = (req, res, next) => {
    let value = req.get('X-Internal-Endpoint');
    if(!value)
        return res.status(403).json({ error: "Request refused." });
    next();
};

// Routes

// Home/Product Listing Page
app.get('/', (req, res) => {
    res.sendFile(getHTMLFile('index.html'));
});

// Login Page
app.get('/auth', (req, res) => {
    return res.sendFile(getHTMLFile('auth.html'));
});

// Register Endpoint
app.post('/users', verifyInternal, (req, res) => {
    let data = req.body;
    let username = String(data.username);
    if(username.length < 5 || username.trim() === "") {
        return res.status(400).json({ message: "Your username should contain: \n- atleast 5 characters\n- atleast one alphanumeric character"});
    }
    if(req.get('X-Verify-Username-Only')) {
        sqlConnection.query('SELECT * FROM users WHERE username = ?', [username], (error, results) => {
            if(error) {
                console.error("Username verification failed.");
                return res.status(500).json({ message: "Username could not be verified." });
            }
            if(results.length > 0) {
                return res.status(409).json({ message: "Someone has used this username." });
            } else {
                return res.status(200).json({ message: "Username is available." });
            }
        });
    } else {
        let fullName = data.fullname;
        let email = data.email;
        let password = data.password;
        let type = data.type; // buyer or seller

        // Verify username does not exist
        sqlConnection.query('SELECT * FROM users WHERE username = ?', [username], (error, results) => {
            if(error) {
                console.error("Username verification failed.");
                return res.status(500).json({ message: "Username could not be verified." });
            }
            if(results.length > 0) {
                return res.status(409).json({ message: "The username you chose is not available!" });
            }        
        });

        // After that, add the user
        sqlConnection.query('INSERT INTO users (username, password, email, fullName, userType) VALUES (?, ?, ?, ?, ?)', [username, password, email, fullName, type], (error, results) => {
            if(error) {
                console.error("Failed to add user to database\n", error);
                return res.status(500).json({ message: error });
            }
            res.cookie('userID', results.insertId, { maxAge: REMEMBER_DURATION });
            return res.json();
        });
    }
});

// Log User In Endpoint
app.get('/users', verifyInternal, (req, res) => {
    let email = req.get("X-Email");
    let password = req.get("X-Password");
    let rememberUser = req.get("X-RememberUser").toLowerCase() === "true";
    sqlConnection.query('SELECT * FROM users WHERE email = ?', [email], (error, results) => {
        if(error) {
            console.error('Failed to obtain user info from email.\n', error);
            return res.status(500).json({ message: 'Server Error' });
        }
        if(results.length === 0)
            return res.status(404).json({ message: "No matching user found." });

        if(results.length > 1) {
            return res.status(409).json({ message: "Multiple users with this email found." });
        }
        let user = results[0];
        if(password !== user.password) {
            return res.status(401).json({ message: "Incorrect password." });
        }

        if(rememberUser) {
            // Time-specified cookie
            res.cookie('userID', user.id, { maxAge: REMEMBER_DURATION });
        } else {
            // Session cookie
            res.cookie('userID', user.id);
        }

        return res.status(200).json({ message: "Login successful.", identity: user.fullName });
    });
});

// Retrieve User Info by ID Endpoint
app.get('/users/:id', verifyInternal, (req, res) => {
    let userId = req.params.id;
    sqlConnection.query('SELECT * FROM users WHERE id = ?', [userId], (error, results) => {
        if(error) {
            console.error(`Unable to retrieve user info for User ID ${userId}\n`, error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
        return res.json(results);
    });
});

// Main Code

let sqlConnection = buildSqlConnection();

sqlConnection.connect(error => {
    if(error) {
        console.error("Database connection failed!\n", error);
        return;
    }
    console.log("Database connected!");
});
app.listen(WEB_SERVER_PORT, () => console.log(`Web server is running on port ${WEB_SERVER_PORT}.`));
