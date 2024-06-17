require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const { PlaidApi, Configuration, PlaidEnvironments } = require('plaid');

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the homepage
app.get('/', (req, res) => {
    res.render('index');
});

// Constants
const CURR_USER_ID = process.env.USER_ID || 1;

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
 * that you want the client to use. We're also hard-coding the application
 * to talk to the SANDBOX environment.
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
