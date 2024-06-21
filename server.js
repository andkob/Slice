require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json()); // middleware to parse JSON bodies
const path = require('path');
const { PlaidApi, Configuration, PlaidEnvironments } = require('plaid');

// database shit
const { User, initDB, findOrCreateUser } = require('./db'); // Import User model and db functions
initDB(); // Initialize the database connection

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the 'public' directory (this might be redundant w ejs who cares)
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the homepage
app.get('/', (req, res) => {
    res.render('index');
});

// Route to serve the logged in page
app.get('/dashboard', (req, res) => {
    res.render('dashboard', {
        username: USER.username, // pass username to ejs template
        bankName: USER.connected_bank
    });
});

// Constants and global variables
var USER; // global user variable for now
var CURR_USER_ID = -1;

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Placeholder route for Plaid login
app.get('/login/plaid', (req, res) => {
    // Redirect to Plaid Link initialization route
    res.redirect('/initialize/plaid');
});

/**
 * TODO - TEMPORARY IMPLEMENTATION
 * Creates a User or finds a user when the login button is pressed
 */
app.post('/create-user', async (req, res) => {
    const { username } = req.body;
    try {
        const user = await findOrCreateUser(username);
        USER = user; // store user globally (TEMPORARY)
        CURR_USER_ID = user.username;
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// TODO -------------------
// Example route to handle Plaid callback (replace with actual Plaid SDK integration)
app.get('/callback/plaid', (req, res) => {
    const { public_token } = req.query;

    // Handle Plaid callback here to exchange `public_token` for `access_token`
    // and store it securely for future API calls

    res.send('Plaid authentication successful!'); // Placeholder response
});

/**
 * Sets up the Plaid client (enabling the Plaid SDK)
 * Creates a new plaidClient that will handle talking to the Plaid API.
 * In the headers, we specify the client_id, secret, and API version
 * that the client will use. We're also hard-coding the application
 * to talk to the SANDBOX environment rn.
 */
const plaidConfig = new Configuration({
    basePath: PlaidEnvironments['sandbox'],
    baseOptions: {
        headers: {
            "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
            "PLAID-SECRET": process.env.PLAID_SECRET,
            "Plaid-Version": "2020-09-14", // Replace with the desired Plaid API version
        },
    },
});
const plaidClient = new PlaidApi(plaidConfig);

/**
 * Provides user with a server-generated Link Token. This token is used
 * both to make sure Plaid knows what application is requesting access to this user's data,
 * and to help Plaid configure the Link process.
 * 
 * This happens by calling the /link/token/create endpoint from the application
 * server, and returning that token up to the client.
 */
app.post("/initialize/plaid", async (req, res, next) => { // previous endpoint name -> "/server/generate_link_token"
    try {
        // the object we pass in to linkTokenCreate that specifies how Link should behave.
        // It can contain a lot of product-specific information, but this one is pretty simple rn.
        const linkTokenConfig = {
            user: { 
                client_user_id: CURR_USER_ID,
            }, // all we provide rn is user id
            client_name: "Finance Assistant Start",
            language: "en",
            products: ["auth"], // only using this product rn
            country_codes: ["US"],
            // webhook: "https://www.example.com/webhook",
        };
        const tokenResponse = await plaidClient.linkTokenCreate(linkTokenConfig);
        const tokenData = tokenResponse.data;
        res.json(tokenData);
    } catch (error) {
        console.log(
            "Running into an error! Note that if you have an error when creating a " +
              "link token, it's frequently because you have the wrong client_id " +
              "or secret for the environment, or you forgot to copy over your " +
              ".env.template file to.env."
        );
        next(error);
    }
});

/**
 * Exchanges the public token received from Link for a more permanent access token.
 * This access token is what will be provided to the Plaid API in order to access the
 * user's data from the particular financial institution.
 * Calls /item/public_token/exchange on the Plaid server.
 */
app.post("/server/swap_public_token", async (req, res, next) => {
    try {
        // calls the Plaid endpoint
        const response = await plaidClient.itemPublicTokenExchange({
            public_token: req.body.public_token,
        });
        // if data is received, updateUserRecord saves the flat file in the database
        // we save the access_token, and make a note in our user record that this user has connected to a bank
        if (response.data != null && response.data.access_token != null) {
            await updateUserRecord("access_token", response.data.access_token);
            await updateUserRecord("user_status", "connected");
            await updateUserRecord("connected_bank", req.body.connected_bank);
        }
        res.json({ status: "success"});
    } catch (error) {
        console.log("Got an error: ", error);
    }
});

/**
 * TODO - TEMPORARY IMPLEMENTATION
 * Fetches some info about our user from our fake "database" and returns it to
 * the client
 */
app.get("/server/get_user_info", async (req, res, next) => {
    try {
        res.json({
            user_status: USER["user_status"],
            user_id: CURR_USER_ID,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Updates the user record in the databse
 */
const updateUserRecord = async function (key, value) {
    try {
        if (!USER) {
            throw new Error(`User not found`);
        }

        USER[key] = value;
        await USER.save(); // ensure changes are saved to the database

        console.log('User record updated successfully:', USER.toJSON());
    } catch (error) {
        console.error('Error updating user record:', error);
        throw error;
    }
};

/**
 * Grabs the results for calling item/get. Useful for debugging purposes.
 */
app.get("/server/get_item_info", async (req, res, next) => {
    try {
        const itemResponse = await plaidClient.itemGet({
            access_token: USER["access_token"]
        });
        res.json(itemResponse.data);
    } catch (error) {
        next(error);
    }
});

/**
 * Grabs the results for calling accounts/get. Useful for debugging purposes.
 */
app.get("/server/get_accounts_info", async (req, res, next) => {
    try {
        const accountResult = await plaidClient.accountsGet({
            access_token: USER["access_token"],
        });
        res.json(accountResult.data);
    } catch(error) {
        next(error);
    }
});
