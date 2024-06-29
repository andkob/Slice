import { callMyServer, showOutput, mergeSortByDate } from "./util.js";
import { showSpendingLineGraph, showSpendingPieChart, updateGraph } from "./spendingSummary.js";

let linkTokenData;
let bankName;

const createUser = async function () {
    const textbox = document.getElementById('usernameBox');
    const input = textbox.value;
    if (input !== "") {
        const user = await callMyServer("/create-user", true, { username: input} );
        console.log('Received user data: ', user);
        
        if (user !== null && user.user_status === "not_connected") {
            showOutput(`User: ${JSON.stringify(user.username)} has logged in`);
            document.querySelector("#startLink").removeAttribute("disabled");
        } else if (user != null && user.user_status == "connected") {
            if (await checkConnectedStatus()) {
                document.querySelector("#continue").removeAttribute("disabled");
            } else {
                // TODO - this will happen inevitably but i just dont wanna deal w it rn
                throw new Error(`Login error! User is logged in but is not connected to a bank`);
            }
        } else {
            showOutput('Please log in to use Slice');
        }
        document.querySelector("#login").setAttribute("disabled", true);
        document.querySelector("#usernameBox").remove();
    }
}

/**
 * Performs user logout and switches to the homepage
 */
const logout = async function () {
    try {
        // Perform logout request
        const logoutResponse = await callMyServer('/server/user/logout', true);
        
        // // Check if logout was successful
        // if (!logoutResponse.ok) {
        //     throw new Error(`Logout request failed with status ${logoutResponse.status}`);
        // }
        
        console.log('User logged out successfully');
        
        // Fetch the homepage HTML
        const response = await fetch('/');
        // Check if fetching homepage was successful
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // Replace the entire body with homepage HTML
        const html = await response.text();
        replaceBodyContent(html);
        showOutput("Log out successful")
    } catch (error) {
        console.error('Error during logout and switching page:', error);
        showOutput('An error occurred during logout. Please try again.'); // Display error message to user
    }
};

const initializeLink = async function () {
    // calls the endpoint of Plaid's server and  saves that value in linkTokenData
    linkTokenData = await callMyServer("/initialize/plaid", true);
    console.log('Reveived link token data: ', linkTokenData);
    // displays the data we receive to the blue <div> on our page, so you can see what's going on.
    if (linkTokenData != null) {
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
const startLink = async function () {
    await initializeLink(); // initialize Plaid Link here

    if (linkTokenData === undefined) {
        return;
    }
    
    const handler = Plaid.create({
        token: linkTokenData.link_token,
        onSuccess: async (publicToken, metadata) => {
            console.log(`ONSUCCESS: Metadata ${JSON.stringify(metadata)}`);
            // Save bank name to later send it back to the server (in exchangeToken)
            bankName = metadata.institution.name;
            await exchangeToken(publicToken); // exchange public token here
            document.querySelector("#startLink").setAttribute("disabled", true);
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
        showOutput('Slice is connected to your financial institution');
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
async function exchangeToken(token) {
    // just a note I pass the bank name to the server during this proccess just cuz its the most convenient
    await callMyServer("/server/swap_public_token", true, {
        public_token: token,
        connected_bank: bankName,
    });
    console.log("Done exchanging our token. I'll re-fetch our status.");
    const success = await checkConnectedStatus();

    if (success) {
        document.querySelector("#continue").removeAttribute("disabled");
    }
}

/**
 * Will switch to the dashboard page
 */
async function switchToDashboard() {
    try {
        const response = await fetch('/dashboard');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const html = await response.text();
        replaceBodyContent(html); // Replace entire body with dashboard HTML

        // show connected accounts
        showConnectedAccounts();
        // show transactions in main container | data is used for summary so we must await completion
        const data = await showTransactions("#main-container", 10);
        // show spending summary
        showSpendingPieChart(data);
        showSpendingLineGraph(data, "spendingLineChart");
    } catch (error) {
        console.error(`Error fetching dashboard:`, error);
    }
}

/**
 * Will switch to the transactions page
 */
async function switchToTransactions() {
    try {
        const response = await fetch('/transactions');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const html = await response.text();
        replaceBodyContent(html);

        // Load transactions here
        const data = await showTransactions("#transactions-container");
        
        // Show line graph
        showSpendingLineGraph(data, "spendingLineChart", 30);
    } catch (error) {
        console.error(`Error fetching transactions page:`, error);
    }
}

// Function to replace body content with new HTML
async function replaceBodyContent(html) {
    document.body.innerHTML = html;
    initializeEventListeners(); // Reapply event listeners after updating the DOM
}

/**
 * Gets information about the item we are connected to
 */
const getItemInfo = async function () {
    const itemData = await callMyServer("/server/get_item_info");
    showOutput(JSON.stringify(itemData));
}

/**
 * The value of accounts is an array, because each Item can be connected
 * to one or more accounts.
 * Each account object will contain information like the name of the account,
 * the type of account, and the account_id.
 * (This account_id is not the same as the actual account number
 * -- it's an internal identifier that Plaid uses to reference this particular account.)
 * You'll also see that this call returns information about the Item as well.
 * -- This is pretty common
 */
// const getAccountsInfo = async function () {
//     const accountsData = await callMyServer('/server/get_accounts_info');
//     return accountsData;
// } dont think I need this one

/**
 * This function will run when the user enters the dashboard
 */
const showConnectedAccounts = async function () {
    const data = await getAuthData();
    const accounts = data.accounts;

    // Select the container where account cards will be added
    const accountCardsContainer = document.querySelector('#account-cards');

    // Iterate through each account and create a card
    accounts.forEach(account => {
        const card = document.createElement('div');
        card.classList.add('account-card');

        let iconSrc = '';
        if (account.subtype === 'checking') {
            iconSrc = '/images/checking-icon.jpg';
        } else if (account.subtype === 'savings') {
            iconSrc = '/images/savings-icon.jpg';
        } else {
            iconSrc = '/images/default-icon.png';
        }
        
        card.innerHTML = `
            <div class="account-info">
                <img src="${iconSrc}" class="account-icon" alt="${account.subtype} icon">
                <div class="account-details">
                    <p>${account.name}</p>
                </div>
            </div>
        `;
        accountCardsContainer.appendChild(card);
    });
}

/**
 * Returns all auth data for User's accounts
 */
const getAuthData = async function () {
    const authData = await callMyServer('/server/fetch_auth_data');
    return authData;
}

/**
 * Gets all account and routing numbers for the User
 */
const getAccountNumbers = async function () {
    try {
        const authData = await getAuthData();
        
        if (!authData || !authData.numbers || !authData.numbers.ach) {
            throw new Error('Invalid authentication data');
        }

        const { ach } = authData.numbers; // just learned this destructuring shit look at that huh
        // iterates over each element in the ach array. For each element, it destructures account and
        // -- routing and gets the corresponding name from authData.accounts using the current index.
        const accountDataString = ach.map(({ account, routing }, index) => {
            const { name } = authData.accounts[index];
            return `${name}: {Account Number: ${account} | Routing Number: ${routing}}`;
        }).join(' >>> ');

        showOutput(accountDataString);
    } catch (error) {
        console.error('Error fetching account numbers:', error);
        showOutput('An error occurred while fetching account numbers. Please try again.');
    }
}

/**
 * Fetches transactions and shows the formatted output.
 * Here is example data from one transaction for reference:
 * 
account_id: "Z1dPoV583vUB4odnqwRvuNwQjX9XMafea7r3L"
account_owner: null
amount: 5.4
authorized_date: "2024-06-22"
authorized_datetime: null
category: (2) ['Travel', 'Taxi']
category_id: "22016000"
check_number: null
counterparties: [{…}]
date: "2024-06-23"
datetime: null
iso_currency_code: "USD"
location: {address: null, city: null, country: null, lat: null, lon: null, …}
logo_url: "https://plaid-merchant-logos.plaid.com/uber_1060.png"
merchant_entity_id: "eyg8o776k0QmNgVpAmaQj4WgzW9Qzo6O51gdd"
merchant_name: "Uber"
name: "Uber 063015 SF**POOL**"
payment_channel: "online"
payment_meta: {by_order_of: null, payee: null, payer: null, payment_method: null, payment_processor: null, …}
pending: false
pending_transaction_id: null
personal_finance_category: {confidence_level: 'VERY_HIGH', detailed: 'TRANSPORTATION_TAXIS_AND_RIDE_SHARES', primary: 'TRANSPORTATION'}
personal_finance_category_icon_url: "https://plaid-category-icons.plaid.com/PFC_TRANSPORTATION.png"
transaction_code: null
transaction_id: "Q49rjo5XnEUVqjLnp8aKcM7ylMeBZbiwlg53D"
transaction_type: "special"
unofficial_currency_code: null
website: "uber.com"
 */
const fetchTransactions = async function () {
    try {
        const transactionData = await callMyServer('/server/fetch_transactions');
        // Format transaction data
        const transactions = transactionData.added;
        const accounts = transactionData.accounts;

        // Link account IDs to their names
        const accountMap = new Map();
        for (let i = 0; i < accounts.length; i++) {
            accountMap.set(accounts[i].account_id, accounts[i].name);
        }

        let transactionDataString = "";

        transactions.forEach((transaction, index) => {
            const {
                account_id,
                merchant_name,
                amount,
                iso_currency_code,
                date,
                category,
            } = transaction;

            const formattedCategory = category ? category.join(', ') : 'N/A';
            // const formattedLocation = location ? `${location.city || ''}, ${location.region || ''}`.trim() : 'N/A';
            let accountName = accountMap.get(account_id);

            transactionDataString += `
                Transaction ${index + 1}:
                - ${accountName}
                - ${merchant_name || 'N/A'}
                - Amount: ${amount} ${iso_currency_code}
                - Date: ${date}
                - Category: ${formattedCategory}
                || `;
        });

        showOutput(transactionDataString);
    } catch (error) {
        console.error('Error fetching transaction data: ', error);
        showOutput('An error occurred while fetching transaction data. Please try again.')
    }
}

/**
 * This function will run when switching the the transactions page.
 * Each transaction and its data is placed in its own card and shown on the page.
 * NOTE: Will only display max 100 transactions, unless more are requested by the server.
 * @param {number} numTransactions default=100. If specified, only this amount of 
 * transactions will be shown
 * @param {string} containerID The ID of the container to display the transactions in
 * 
 * @returns Transaction data received from the server (see use in switchToDashboard)
 */
const showTransactions = async function (containerID, numTransactions = 100) {
    try {
        const transactionData = await callMyServer('/server/fetch_transactions');
        // Format transaction data
        const transactions = transactionData.added;
        const accounts = transactionData.accounts;

        // Link account IDs to their names
        const accountMap = new Map();
        for (let i = 0; i < accounts.length; i++) {
            accountMap.set(accounts[i].account_id, accounts[i].name);
        }

        // Sort transactions by date (most recent first)
        const sortedTransactions = mergeSortByDate(transactions);

        const transactionsContainer = document.querySelector(containerID);

        for (let i = 0; i < Math.min(transactions.length, numTransactions); i++) {
            let transactionDataString = "";
            const transaction = sortedTransactions[i];
            const {
                account_id,
                merchant_name,
                amount,
                iso_currency_code,
                date,
                category,
            } = transaction;

            const formattedCategory = category ? category.join(', ') : 'N/A';
            let accountName = accountMap.get(account_id);

            transactionDataString = `
                Transaction ${i + 1}:
                - ${accountName}
                - ${merchant_name || 'N/A'}
                - Amount: $${amount} ${iso_currency_code}
                - Date: ${date}
                - Category: ${formattedCategory}
                `;

            const card = document.createElement('div');
            card.classList.add('transaction-card');

            // Determine the class for the amount based on its value
            const amountClass = amount < 0 ? 'positive' : 'negative';
            const borderColor = amount < 0 ? 'rgb(214, 0, 0)' : 'rgb(0, 184, 0)';
            card.style.borderColor = borderColor;

            card.innerHTML = `
            <div class="transaction-info">
                <div class="account-details">
                    <p class="transaction-amount ${amountClass}">${transactionDataString}</p>
                </div>
            </div>
            `;
            transactionsContainer.appendChild(card);
        }

        return transactionData;
    } catch (error) {
        console.error('Error fetching transaction data: ', error);
    }
}

/**
 * balanceData is the same data one would receive by calling accounts/get_info,
 * but this is real time. I don't know if I'll need this but its here for now.
 */
const fetchRealtimeBalances = async function () {
    try {
        const balanceData = await callMyServer('/server/get_realtime_balance');
        const accounts = balanceData.accounts;

        // Use map and join to create the balance string
        const balanceString = accounts.map(({ name, balances }) => 
            `${name}: $${balances.available || '0.00'}`
        ).join(' || ');

        showOutput(balanceString);
    } catch (error) {
        console.error('Error fetching balance data: ', error);
        showOutput('An error occurred while fetching balance data. Please try again.')
    }
}

// Function to initialize event listeners
function initializeEventListeners() {
    const selectorsAndFunctions = {
        "#login": createUser,
        "#startLink": startLink,
        "#continue": switchToDashboard,
        "#transactionsPageButton": switchToTransactions,
        "#backToDashboard": switchToDashboard,
        "#itemInfo": getItemInfo,
        "#accountNumbers": getAccountNumbers,
        "#transactionData": fetchTransactions,
        "#realtimeBalance": fetchRealtimeBalances,
        "#logout": logout,
        "#oneWeek": () => {
            console.log("seven Days clicked")
            updateGraph(7)},
        "#twoWeeks": () => updateGraph(14),
        "#oneMonth": () => updateGraph(30),
        "#threeMonths": () => updateGraph(90),
        "#oneYear": () => updateGraph(365)
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
