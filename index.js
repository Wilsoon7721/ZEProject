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
        return res.status(403).json({ message: "Request refused." });
    next();
};

// Routes

// Generic Query Endpoint
app.get('/custom_query', verifyInternal, (req, res) => {
    let sqlQuery = req.get('X-SQL-Query');
    if(!sqlQuery)
        return res.status(500).json({ message: "Missing query" });
    sqlConnection.query(sqlQuery, (error, results) => {
        if(error) {
            console.error("Custom Query Failed\n", error);
            return res.status(500).json({ error: error });
        }
        return res.json(results);
    });
});

// Home/Product Listing Page
app.get('/', (req, res) => {
    let userID = extractUserID(req);
    sqlConnection.query('SELECT userType FROM users WHERE id = ?', [userID], (error, results) => {
        if(error) {
            console.error(`Failed to retrieve userType for User ID ${userID}\n`, error);
            return res.status(500).json({ message: "Internal Error" });
        }
        let data = results[0];
        if(data === undefined || !('userType' in data) || data.userType === 'buyer') {
            res.sendFile(getHTMLFile('buyer/index.html'));
        } else {
            res.sendFile(getHTMLFile('seller/index.html'));
        }
        return;
    });
});

// Login Page
app.get('/auth', (req, res) => {
    let userID = extractUserID(req);
    if(userID === -1) 
        return res.sendFile(getHTMLFile('auth.html'));
    else
        return res.redirect('/');
});

// PAYMENTS ENDPOINTS

// User interface endpoint
app.get('/pay', (req, res) => {
    return res.sendFile(getHTMLFile('buyer/pay.html'));
});

// Queries Database by Payment ID
// Requires key: 'paymentID'
app.get('/payments', verifyInternal, (req, res) => {
    let id = req.get('X-Payment-ID') || req.get('X-Order-ID');
    if(!id)
        return res.status(400).json({ message: "Missing payment/order ID" });
    let query;
    if(req.get('X-Payment-ID'))
        query = 'paymentID = ?';
    else 
        query = 'orderID = ?'
    sqlConnection.query(`SELECT * FROM payments WHERE ${query}`, [id], (error, results) => {
        if(error) {
            console.error(error);
            return res.status(500).json({ message: "Failed to obtain payment details." });
        }
        if(results.length === 0)
            return res.status(404).json({ message: "This payment does not exist." });

        return res.json(results);
    });
});

// Create a payment (used at cart.js when user presses PAY, but not paid yet)
// Returns a payment ID that should be passed to GET /payments
app.post('/payments', verifyInternal, (req, res) => {
    let userID = extractUserID(req);
    let orderID = req.body.orderID;
    let amount = req.body.amount;
    if(userID === -1)
        return res.status(401).json({ message: "You are not authorised." });

    sqlConnection.query('INSERT INTO payments (orderID, amount) VALUES (?, ?)', [orderID, amount], (error, results) => {
        if(error) {
            console.error(error);
            return res.status(500).json({ message: "Failed to complete payment" });
        }
        return res.json({ paymentID: results.insertId });
    });
});

// Update a payment (after user pays with credit card, can update here using paymentID)
// Accepted keys: `paymentStatus` or `paymentMethod`
app.put('/payments/:id', verifyInternal, (req, res) => {
    let paymentID = req.params.id;
    let q = 'UPDATE payments SET ';
    let params = [];
    if('paymentStatus' in req.body) {
        let paymentStatus = String(req.body.paymentStatus).toLowerCase();
        let validStatuses = ['pending', 'completed', 'refunded'];
        if(!validStatuses.includes(paymentStatus))
            return res.status(500).json({ message: "You specified an invalid payment status." });
        q += 'paymentStatus = ?, ';
        params.push(paymentStatus);
    }
    if('paymentMethod' in req.body) {
        q += 'paymentMethod = ?, ';
        params.push(req.body.paymentMethod);
    }

    if(params.length === 0)
        return res.status(400).json({ message: "Nothing to change." });
    if(q.trim().endsWith(','))
        q = q.trimEnd().slice(0, -1);

    q += 'WHERE paymentID = ?';
    params.push(paymentID);
    sqlConnection.query(q, params, (error, results) => {
        if(error) {
            console.error(error);
            return res.status(500).json({ message: "Failed to update payment" });
        }
        if(results.affectedRows === 0) {
            res.status(404).json({ message: "The payment does not exist." });
            return;
        }
        return res.json();
    });
});

// ORDERS ENDPOINTS

// User interface endpoint
app.get('/orders', (req, res) => {
    return res.sendFile(getHTMLFile('buyer/orders.html'));
});

// Gets an order, will retrieve all products related to the buyer ID (array of objects).
app.get('/orders/:id', verifyInternal, (req, res) => {
    let buyerID = req.params.id;
    sqlConnection.query('SELECT * FROM orders WHERE buyerID = ?', [buyerID], (error, results) => {
        if(error) {
            console.error(error);
            return res.status(500).json({ message: `Failed to retrieve orders by buyer ID ${orderID}` });
        }
        if(results.length === 0) {
            return res.status(404).json({ message: "This order does not exist." });
        }
        return res.json(results);
    });
});

app.get('/order_id', verifyInternal, (req, res) => {
    sqlConnection.query('SELECT IFNULL(MAX(orderID), 0) + 1 AS nextOrderID FROM orders', (error, results) => {
        if(error) {
            console.error(error);
            return res.status(500).json({ message: "Failed to obtain next available order ID." });
        }
        return res.json({ id: parseInt(results[0].nextOrderID) });
    });
});

// Create an order (JSON keys accepted: orderID, buyerID, productID, quantity)
// COMPOSITE PRIMARY KEY: orderID (generated by /order_id), productID
app.post('/orders', verifyInternal, (req, res) => {
    let userID = extractUserID(req);
    if(userID === -1) {
        return res.status(500).json({ message: "You are not authorised." }); 
    }
    let orderID = req.body.orderID;
    let buyerID = req.body.buyerID;
    let productID = req.body.productID;
    let quantity = req.body.quantity;

    sqlConnection.query("INSERT INTO orders (orderID, buyerID, productID, quantity) VALUES (?, ?, ?, ?)", [orderID, buyerID, productID, quantity], (error, results) => {
        if(error) {
            console.error(error);
            return res.status(500).json({ message: "Failed to process product for the order." });
        }
        return res.json({ message: "Product successfully added to order." });
    });
});

// Updates an order (JSON keys accepted: buyerID, quantity, orderStatus, shipmentStatus)
// Updating requires orderID and productID because of composite primary key.
app.put('/orders', verifyInternal, (req, res) => {
    if(!('orderID' in req.body) || !('productID' in req.body)) 
        return res.status(400).json({ message: "Missing key: orderID / productID" });
    if(req.body.length === 0) 
        return res.status(400).json({ message: "Nothing to change." });
    let q = `UPDATE orders SET `;
    let orderID = req.body.orderID;
    let productID = req.body.productID;
    let params = [];
    if('buyerID' in req.body) {
        q += `buyerID = ?, `;
        params.push(req.body.buyerID);
    }
    if('quantity' in req.body) {
        q += `quantity = ?, `;
        params.push(req.body.quantity);
    }
    if('orderStatus' in req.body) {
        q += `orderStatus = ?, `;
        params.push(req.body.orderStatus);
    }
    if('shipmentStatus' in req.body) {
        q += `shipmentStatus = ?, `;
        params.push(req.body.shipmentStatus);
    }

    if(params.length === 0)
        return res.status(400).json({ message: "Nothing to change." });
    if(q.trim().endsWith(','))
        q = q.trimEnd().slice(0, -1);

    q += `WHERE orderID = ? AND productID = ?`;
    params.push(orderID);
    params.push(productID);
    sqlConnection.query(q, params, (error, results) => {
        if(error) {
            console.error(`Failed to update order info for order ID ${orderID} and productID ${productID}.\n`, error);
            res.status(500).json({ message: "Internal Server Error" });
            return;
        }
        if(results.affectedRows === 0) {
            res.status(404).json({ message: "The order does not exist." });
            return;
        }
        return res.json();
    });
});

// CART ENDPOINTS

// Loads cart from database and renders page
app.get('/cart', (req, res) => {
    let userID = extractUserID(req);
    if(userID === -1) {
        return res.redirect('/');
    }
    if(req.get('X-Internal-Endpoint')) {
        if(req.get('X-Return-Price-Only')) {
            sqlConnection.query('SELECT cart FROM users WHERE id = ?', [userID], (error, results) => {
                if(error) {
                    console.error(error);
                    return res.status(500).json({ message: "Failed to obtain cart total." });
                }
                if(results.length === 0)
                    return res.status(404).json({ message: "User not found." });
                let cart = {}
                if(results[0].cart) {
                    cart = JSON.parse(results[0].cart);
                }
                let totalPrice = 0;
                let productQueries = Object.keys(cart).map(productId => {
                        let cartQuantity = parseInt(cart[productId]);
                        return new Promise((resolve, reject) => {
                            sqlConnection.query(`SELECT price FROM products WHERE productID = ?`, [productId], (error, results) => {
                                if(error) {
                                    reject(error);
                                } else {
                                    if(!results || results.length === 0) {
                                        totalPrice += 0;
                                        resolve();
                                    } else {
                                        let productPrice = parseFloat(results[0].price);
                                        totalPrice += (productPrice * cartQuantity);
                                        resolve();
                                    }
                                }
                            });
                        });
                    });

                Promise.all(productQueries).then(() => {
                    return res.json({ price: totalPrice }); 
                }).catch(error => {
                    console.error(error);
                    return res.status(500).json({ message: "Failed to obtain cart total." });
                });
            });
        } else if(req.get('X-Return-Size-Only')) {
            sqlConnection.query('SELECT cart FROM users WHERE id = ?', [userID], (error, results) => {
                if(error) {
                    console.error(error);
                    return res.status(500).json({ message: "Failed to obtain cart size." });
                }
                if(results.length === 0)
                    return res.status(404).json({ message: "User not found." });
                let cart = {};
                if(results[0].cart) {
                    cart = JSON.parse(results[0].cart);
                }
                let cartQuantities = 0;
                for(let key in cart) {
                    cartQuantities += cart[key]; 
                }
                return res.status(200).json({ size: cartQuantities });
            })
        } else {
            sqlConnection.query('SELECT cart FROM users WHERE id = ?', [userID], (error, results) => {
                if(error) {
                    console.error(error);
                    return res.status(500).json({ message: "Failed to obtain cart size." });
                }
                if(results.length === 0)
                    return res.status(404).json({ message: "User not found." });
                let cart = {};
                if(results[0].cart) {
                    cart = JSON.parse(results[0].cart);
                }
                return res.json(cart);
            });
        }
    } else {
        return res.sendFile(getHTMLFile('buyer/cart.html'));
    }
});

// Add to cart (supply body [id]) [INCREMENT BY 1]
app.post('/cart', verifyInternal, (req, res) => {
    if (!req.body.id) {
        return res.status(400).json({ message: "Missing 'id' field for product ID" });
    }
    let productId = req.body.id;
    let userID = extractUserID(req);
    if(userID === -1)
        return res.status(401).json({ message: "You are not authorised. "});

    // Perform stock validation
    let productStock;
    sqlConnection.query('SELECT quantity FROM products WHERE productID = ?', [productId], (error, results) => {
        if(error) {
            console.error(error);
            return res.status(500).json({ message: "Database query failed." });
        }
        productStock = parseInt(results[0].quantity);
    });

    sqlConnection.query('SELECT cart FROM users WHERE id = ?', [userID], (error, results) => {
        if(error) {
            console.error(error);
            return res.status(500).json({ message: "Database query failed." });
        }
        if(results.length === 0)
            return res.status(404).json({ message: "User not found." });
        let cart = {};
        if(results[0].cart) {
            cart = JSON.parse(results[0].cart);
        }
        let limitReached = false;
        if(cart.hasOwnProperty(productId)) {
            let quantity = cart[productId];
            if(quantity >= productStock) {
                cart[productId] = productStock;
                limitReached = true;
            } else {
                cart[productId] = quantity + 1;   
            }
        } else {
            cart[productId] = 1;
        }
        sqlConnection.query('UPDATE users SET cart = ? WHERE id = ?', [JSON.stringify(cart), userID], (error, results) => {
            if(error) {
                console.error(error);
                return res.status(500).json({ message: "Database update failed." });
            }
            let cartQuantities = 0;
            for(let key in cart) {
                cartQuantities += parseInt(cart[key]);
            }
            if(limitReached) {
                return res.status(409).json({ message: `You have exceeded the maximum limit purchasable for this product.`, newSize: cartQuantities });
            }
            return res.json({ message: `+1 of product ID ${productId} added.`, newSize: cartQuantities });
        });
    });
});

// Put to Cart (sets value. THIS DOES NOT PERFORM ANY STOCK CHECK)
app.put('/cart', verifyInternal, (req, res) => {
    let productId = req.body.id;
    let amount = parseInt(req.body.amount);
    let userID = extractUserID(req);
    if(userID === -1)
        return res.status(401).json({ message: "You are not authorised. "});
    let productStock;
    sqlConnection.query('SELECT quantity FROM products WHERE productID = ?', [productId], (error, results) => {
        if(error) {
            console.error(error);
            return res.status(500).json({ message: "Database query failed." });
        }
        productStock = parseInt(results[0].quantity);
    });
    sqlConnection.query('SELECT cart FROM users WHERE id = ?', [userID], (error, results) => {
        if(error) {
            console.error(error);
            return res.status(500).json({ message: "Database query failed." });
        }
        if(results.length === 0)
            return res.status(404).json({ message: "User not found." });
        let cart = {};
        if(results[0].cart) {
            cart = JSON.parse(results[0].cart);
        }
        let limitReached = false;
        if(amount > productStock) {
            cart[productId] = productStock;
            limitReached = true;
        } else {
            cart[productId] = amount;   
        }
        sqlConnection.query('UPDATE users SET cart = ? WHERE id = ?', [JSON.stringify(cart), userID], (error, results) => {
            if(error) {
                console.error(error);
                return res.status(500).json({ message: "Database update failed." });
            }
            if(limitReached)
                return res.status(409).json({ message: 'Limit reached.' });
            return res.json({ message: 'Successful Modification' });
        });
    });
});

// Deletes from cart (supply query parameters ?id=&quantity=, or special header for ALL)
app.delete('/cart', verifyInternal, (req, res) => {
    let userID = extractUserID(req);
    if(userID === -1)
        return res.status(401).json({ message: "You are not authorised. "});
    if(req.get('X-Wipe-Cart')) {
        sqlConnection.query('UPDATE users SET cart = NULL WHERE id = ?', [userID], (error, results) => {
            if(error) {
                console.error(error);
                return res.status(500).json({ message: "Cart could not be cleared." });
            }
        });
        return res.json();
    }
    let id = req.query.id;
    let quantity = req.query.quantity;
    sqlConnection.query('SELECT cart FROM users WHERE id = ?', [userID], (error, results) => {
        if(error) {
            console.error(error);
            return res.status(500).json({ message: "Database query failed." });
        }
        if(results.length === 0)
            return res.status(404).json({ message: "User not found." });
        let cart = {};
        let customMessage;
        if(results[0].cart) {
            cart = JSON.parse(results[0].cart);
        }
        let oldQuantity = cart[id] || 0;
        if(quantity == 'all' || oldQuantity - parseInt(quantity) <= 0) {
            delete cart[id];
            customMessage = "This item has been deleted.";
        } else {
            cart[id] = oldQuantity - quantity;
            customMessage = `You have removed ${quantity} of this item.`;
        }
        sqlConnection.query('UPDATE users SET cart = ? WHERE id = ?', [JSON.stringify(cart), userID], (error, results) => {
            if(error) {
                console.error(error);
                return res.status(500).json({ message: "Database update failed." });
            }
            let cartQuantities = 0;
            for(let key in cart) {
                cartQuantities += parseInt(cart[key]);
            }
            return res.json({ message: customMessage, newSize: cartQuantities });
        });
    });
});


// PRODUCTS TABLE ENDPOINTS

// Update Product
// JSON Keys accepted: productName, productDescription, price, quantity
app.put('/products/:id', verifyInternal, (req, res) => {
    let id = req.params.id;
    let params = []
    let q = 'UPDATE products SET ';
    if('productName' in req.body) {
        q += 'productName = ?, ';
        params.push(req.body.productName);
    }
    if('productDescription' in req.body) {
        q += 'productDescription = ?, ';
        params.push(req.body.productDescription);
    }
    if('price' in req.body) {
        q += 'price = ?, ';
        params.push(req.body.price);
    }
    if('quantity' in req.body) {
        q += 'quantity = ?, ';
        params.push(req.body.quantity);
    }

    if(params.length === 0)
        return res.status(400).json({ message: "Nothing to change." });
    if(q.trim().endsWith(','))
        q = q.trimEnd().slice(0, -1);

    q += `WHERE id = ?`;
    params.push(id);
    sqlConnection.query(q, params, (error, results) => {
        if(error) {
            console.error("Failed to update product\n", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
        if(results.affectedRows === 0)
            return res.status(404).json({ message: "The product does not exist."});
        return res.json();
    });
});

// Create Product
// JSON Keys accepted: sellerID, productName, productDescription, price, quantity
app.post('/products', verifyInternal, (req, res) => {
    // Remember to add JSON as content type
    let data = req.body;
    let sellerId = req.body.sellerID;
    let productName = req.body.productName;
    let productDescription = req.body.productDescription;
    let price = req.body.price;
    let quantity = req.body.quantity;
    sqlConnection.query('INSERT INTO products (sellerID, productName, productDescription, price, quantity) VALUES (?, ?, ?, ?, ?)', [sellerId, productName, productDescription, price, quantity], (error, results) => {
        if(error) {
            console.error("Failed to create a product.\n", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
        return res.json({ id: results.insertId });
    });
});

app.get('/products/:id', verifyInternal, (req, res) => {
    let productId = req.params.id;
    if(productId === 'all') {
        sqlConnection.query('SELECT * FROM products', (error, results) => {
            if(error) {
                console.error("Failed to retrieve all products\n", error);
                return res.status(500).json({ message: "Internal Server Error" });
            }
            return res.json(results);
        });
    } else if(!isNaN(productId)) {
        // Number
        sqlConnection.query('SELECT * FROM products WHERE productId = ?', [productId], (error, results) => {
            if(error) {
                console.error("Failed to retrieve the product\n", error);
                return res.status(500).json({ message: "Internal Server Error" });
            }
            if(results.length === 0)
                return res.status(404).json({ message: "Product does not exist." });
            return res.json(results);
        });
    } else
        return res.status(400).json({ message: "Product ID must be numeric." });
});

// USERS TABLE ENDPOINTS

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
            return res.status(500).json({ message: "Internal Server Error" });
        }
        return res.json(results);
    });
});

// Delete User By ID
app.delete('/users/:id', verifyInternal, (req, res) => {
    let userId = req.params.id;
    sqlConnection.query('DELETE FROM users WHERE id = ?', [userId], (error, results) => {
        if(error) {
            console.error(`Failed to delete User with ID ${userId}\n`, error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
        return res.json();
    });
});

// Values expected in JSON (preferred) or Form Data
// Keys accepted: username, email, fullName, password, address, phoneNumber
app.put('/users/:id', verifyInternal, (req, res) => {
    let userId = req.params.id;
    if(req.body.length === 0) 
        return res.status(400).json({ message: "Nothing to change." });
    let q = `UPDATE users SET `;
    let params = [];
    if('username' in req.body) {
        // Will directly update. No uniqueness check
        q += `username = ?, `;
        params.push(req.body.username);
    }
    if('email' in req.body) {
        q += `email = ?, `;
        params.push(req.body.email);
    }
    if('fullName' in req.body) {
        q += `fullName = ?, `;
        params.push(req.body.fullName);
    }
    if('password' in req.body) {
        q += `password = ?, `;
        params.push(req.body.password);
    }
    if('address' in req.body) {
        q += `address = ?, `;
        params.push(req.body.address);
    }
    if('phoneNumber' in req.body) {
        q += `phoneNumber = ?, `;
        params.push(req.body.phoneNumber);
    }

    if(params.length === 0)
        return res.status(400).json({ message: "Nothing to change." });
    if(q.trim().endsWith(','))
        q = q.trimEnd().slice(0, -1);

    q += `WHERE id = ?`;
    params.push(userId);
    sqlConnection.query(q, params, (error, results) => {
        if(error) {
            console.error(`Failed to update user info for user ID ${userId}\n`, error);
            res.status(500).json({ message: "Internal Server Error" });
            return;
        }
        if(results.affectedRows === 0) {
            res.status(404).json({ message: "The user does not exist." });
            return;
        }
        return res.json();
    });
});

function extractUserID(req) {
    let cookies;
    let userID = -1;
    try {
        cookies = req.headers.cookie.split(';');
    } catch(error) {
        return userID;
    }
    for(let cookie of cookies) {
        cookie = cookie.trim();
        if(cookie.startsWith("userID")) {
            let val = cookie.substring("userID=".length);
            userID = parseInt(val);
            break;
        }
        continue;
    }
    return userID;
}

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
