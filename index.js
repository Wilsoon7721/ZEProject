const mysql = require('mysql');

const app = require('express')();

// Configuration
const WEB_SERVER_PORT = 3000;
const SQL_HOST = "localhost";
const SQL_PORT = 3306;
const SQL_USER = "root";
const SQL_PASSWORD = "root";
const SQL_DATABASE = "tradeplatform";


function buildSqlConnection() {
    return mysql.createConnection({
        host: SQL_HOST, 
        port: SQL_PORT,
        user: SQL_USER,
        password: SQL_PASSWORD,
        database: SQL_DATABASE
    });
}

let sqlConnection = buildSqlConnection();

sqlConnection.connect(error => {
    if(error) {
        console.error("Database connection failed!\n", error);
        return;
    }
    console.log("Database connected!");
});
app.listen(WEB_SERVER_PORT, () => console.log(`Web server is running on port ${WEB_SERVER_PORT}.`));
