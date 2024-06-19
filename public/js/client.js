import { callMyServer, showOutput } from "./util.js";

let linkTokenData;
let publicTokenToExchange;
let bankName;

const createUser = async function () {
    const textbox = document.getElementById('usernameBox');
    const input = textbox.value;
    if (input !== "") {
        const user = await callMyServer("/create-user", true, { username: input} );
        console.log('Received user data: ', user);
        
        if (user !== null && user.user_status === "not_connected") {
            document.querySelector("#initializeLink").removeAttribute("disabled");
            showOutput(`User: ${JSON.stringify(user.username)} has logged in`);
        } else if (user != null && user.user_status == "connected") {
            if (await checkConnectedStatus()) {
                document.querySelector("#continue").removeAttribute("disabled");
            } else {
                // TODO - this will happen inevitably but i just dont wanna deal w it rn
                throw new Error(`Login error! User is logged in but is not connected to a bank`);
            }
        } else {
            return;
        }
        document.querySelector("#login").setAttribute("disabled", true);
        document.querySelector("#usernameBox").remove();
    }
}

const initializeLink = async function () {
    // calls the endpoint of Plaid's server and  saves that value in linkTokenData
    linkTokenData = await callMyServer("/initialize/plaid", true);
    console.log('Reveived link token data: ', linkTokenData);
    // displays the data we receive to the blue <div> on our page, so you can see what's going on.
    if (linkTokenData != null) {
        document.querySelector("#startLink").removeAttribute("disabled");
        document.querySelector("#initializeLink").setAttribute("disabled", true);
        showOutput(`Received link token data ${JSON.stringify(linkTokenData)}`);
    }
};

/**
 * creates a Link handler object by calling Plaid.create. When called, 
 * an object that contains several values is passed in. 
 * The token is the Link token that was created (and stored) in the initialization step.
 * 
 * We also define three other callback functions:
 * onSuccess - is called when Link completes successfully.
 * onExit - is called when Link exits before completing successfully (either because it encountered an error, or the user explicitly quit the process)
 * onEvent - is called at other intermediary steps throughout the Link process
 * 
 * After the Link handler is created, open is called on it, which will open up the Link widget.
 * 
 * ***NOTES***
 * You'll notice the onSuccess handler is passed in a publicToken argument. 
 * This is the token that your client receives back from Link. This short-lived token has one purpose, 
 * and that's for your application to exchange it server-side for a more permanent access token that 
 * can be used to contact this bank in the future.
 * 
 * For FUTURE reference: Typically you'd use this metadata with your own analytics to help inform you how well your users are
 * converting and identify any potential problems.
 * Also rn the metadata shit is mad bugged
 */
const startLink = function () {
    if (linkTokenData === undefined) {
        return;
    }
    
    const handler = Plaid.create({
        token: linkTokenData.link_token,
        onSuccess: async (publicToken, metadata) => {
            console.log(`ONSUCCESS: Metadata ${JSON.stringify(metadata)}`);
            showOutput(`I have a public token: ${publicToken} I should exchange this`);
            publicTokenToExchange = publicToken;
            document.querySelector("#exchangeToken").removeAttribute("disabled"); // *
            document.querySelector("#startLink").setAttribute("disabled", true);

            // Save bank name to later send it back to the server
            bankName = metadata.institution.name;
        },
        onExit: (err, metadata) => {
            console.log(`Exited early. Error: ${JSON.stringify(err)} Metadata: ${JSON.stringify(metadata)}`);
            showOutput(`Link existed early with status ${metadata.status}`)
        },
        onEvent: (eventName, metadata) => {
            console.log(`Event ${eventName}, Metadata: ${JSON.stringify(metadata)}`);
        },
    });
    handler.open();
};

export const checkConnectedStatus = async function () {
    const connectedData = await callMyServer("/server/get_user_info");
    console.log(connectedData.user_status);
    if (connectedData.user_status === "connected") {
        showOutput('Plaid is connected to your financial institution');
        return true;
    }
    return false;
}

/**
 * Exchanges the public token received from Link for a more permanent access token.
 * This access token is what will be provided to the Plaid API in order to access the
 * user's data from the particular financial institution.
 * Calls /item/public_token/exchange on the Plaid server.
 * *Also sends bank name over to the server btw
 * 
 * Once complete, an 'item' is created. An "Item" is the term Plaid uses to represent
 * a login to a specific financial institution. An Item is only associated with one user
 * and one financial institution, although it may represent multiple accounts at that
 * particular institution (like a checking and savings account, for example).
 * 
 * Every item comes with an item_id and an access_token. The item_id is the public
 * identifier that you can use to refer to this item.
 * 
 * The access_token is the more secret identifier for this item. If your application wants
 * to request data on behalf of your user, you would do this by passing along the access token.
 * For this reason, you should keep the access_token on the server and treat it like you would
 * any other sensitive piece of data.
 * 
 * The whole point of doing all this is to be able to use endpoints that belong to a
 * specific Plaid product.
 */
async function exchangeToken() {
    await callMyServer("/server/swap_public_token", true, {
        public_token: publicTokenToExchange,
        connected_bank: bankName,
    });
    console.log("Done exchanging our token. I'll re-fetch our status.");
    const success = await checkConnectedStatus();

    if (success) {
        document.querySelector("#exchangeToken").setAttribute("disabled", true);
        document.querySelector("#continue").removeAttribute("disabled");
    }
}

async function continueToDashboard() {
    try {
        const response = await fetch('/dashboard', { bankName });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const html = await response.text();
        replaceBodyContent(html); // Replace entire body with dashboard HTML
    } catch (error) {
        console.error('Error fetching dashboard:', error);
    }
}

/**
 * Gets information about the item we are connected to
 */
const getItemInfo = async function () {
    const itemData = await callMyServer("/server/get_item_info");
    showOutput(JSON.stringify(itemData));
}

// Function to replace body content with new HTML
async function replaceBodyContent(html) {
    document.body.innerHTML = html;
    initializeEventListeners(); // Reapply event listeners after updating the DOM
}

// Function to initialize event listeners
function initializeEventListeners() {
    const selectorsAndFunctions = {
        "#login": createUser,
        "#initializeLink": initializeLink,
        "#startLink": startLink,
        "#exchangeToken": exchangeToken,
        "#continue": continueToDashboard,
        "#itemInfo": getItemInfo
    };

    // Loop through selectors and add event listeners
    Object.entries(selectorsAndFunctions).forEach(([sel, fun]) => {
        const element = document.querySelector(sel);
        if (element) {
            element.addEventListener("click", fun);
        } else {
            // Note that elements on different pages will not be found
            // I could just get rid of this warning but ill keep it for now so I can see stuff
            console.warn(`Could not find element ${sel} on the dashboard page.`);
        }
    });
}

// Call initializeEventListeners() once the DOM is fully loaded initially
document.addEventListener("DOMContentLoaded", () => {
    initializeEventListeners();
});
