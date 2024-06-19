import { callMyServer, showOutput } from "./util.js";

let linkTokenData;
let publicTokenToExchange;

const createUser = async function () {
    const textbox = document.getElementById('usernameBox');
    const input = textbox.value;
    if (input != "") {
        const user = await callMyServer("/create-user", true, { username: input} );
        console.log('Received user data: ', user);
        
        if (user != null) {
            document.querySelector("#initializeLink").removeAttribute("disabled");
            document.querySelector("#login").setAttribute("disabled", true);
            document.querySelector("#usernameBox").remove();
            showOutput(`User: ${JSON.stringify(user.username)} has logged in`);
        }
    }
}

export const checkConnectedStatus = async function () {
    const connectedData = await callMyServer("/server/get_user_info");
    if (connectedData.user_status === "connected") {
        showOutput('Plaid is connected to your financial institution');
        document.querySelector("#exchangeToken").setAttribute("disabled", true);
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

// Connect selectors to functions
const selectorsAndFunctions = {
    "#login": createUser,
    "#initializeLink": initializeLink,
    "#startLink": startLink,
    "#exchangeToken": exchangeToken
};

Object.entries(selectorsAndFunctions).forEach(([sel, fun]) => {
    if (document.querySelector(sel) == null) {
      console.warn(`Hmm... couldn't find ${sel}`);
    } else {
      document.querySelector(sel)?.addEventListener("click", fun);
    }
});

async function exchangeToken() {
    await callMyServer("/server/swap_public_token", true, {
        public_token: publicTokenToExchange,
    });
    console.log("Done exchanging our token. I'll re-fetch our status.");
    await checkConnectedStatus();
}