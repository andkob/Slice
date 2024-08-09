export const callMyServer = async function (endpoint, isPost = false, postData = null) {
  const optionsObj = isPost ? { method: "POST" } : {};

  if (isPost && postData !== null) {
    optionsObj.headers = { "Content-type": "application/json" }; // ensures that the server can correctly parse the incoming JSON data
    optionsObj.body = JSON.stringify(postData);
  }

  const response = await fetch(endpoint, optionsObj);
  if (response.status === 500) {
    await handleServerError(response);
    return;
  }

  const data = await response.json();
  console.log(`Result from calling ${endpoint}: ${JSON.stringify(data)}`);
  return data;
};

/**
 * Used to display results to the output box when initializing Link
 * @param textToShow  
 */
export const showOutput = function (textToShow) {
  if (textToShow == null) return;
  const output = document.querySelector("#output");
  output.textContent = textToShow;
};

const handleServerError = async function (responseObject) {
  const error = await responseObject.json();
  console.error("I received an error ", error);
  if (error.hasOwnProperty("error_message")) {
    showOutput(`Error: ${error.error_message} -- See console for more`);
  }
};

/**
 * Sorts elements in an array in descending order. O(n log n)
 * @param {*} arr The array to be sorted
 * @returns The sorted array in descending order
 */
export function mergeSortByDate(arr) {
  if (arr.length <= 1) {
      return arr; // Base case: arrays with 0 or 1 element are already sorted
  }

  // Splitting the array into two halves
  const mid = Math.floor(arr.length / 2);
  const left = arr.slice(0, mid);
  const right = arr.slice(mid);

  // Recursively sort each half
  const sortedLeft = mergeSortByDate(left);
  const sortedRight = mergeSortByDate(right);

  // Merge the sorted halves
  return mergeByDate(sortedLeft, sortedRight);
}

function mergeByDate(left, right) {
  let result = [];
  let leftIndex = 0;
  let rightIndex = 0;

  // Merge sorted arrays into result array in ascending order
  while (leftIndex < left.length && rightIndex < right.length) {
      if (left[leftIndex].date > right[rightIndex].date) {
          result.push(left[leftIndex]);
          leftIndex++;
      } else {
          result.push(right[rightIndex]);
          rightIndex++;
      }
  }

  // Concatenate remaining elements
  return result.concat(left.slice(leftIndex), right.slice(rightIndex));
} // TODO use radix sort instead cuz its cool

export const createTransactionCard = (transaction, index, accountMap) => {
  const {
    account_id,
    merchant_name,
    amount,
    iso_currency_code,
    date,
    category,
  } = transaction;

  const formattedCategory = category ? category.join(', ') : 'N/A';
  const accountName = accountMap.get(account_id);

  // Determine the class for the amount based on its value
  const amountClass = amount < 0 ? 'positive' : 'negative';
  const borderColor = amount < 0 ? 'rgb(214, 0, 0)' : 'rgb(0, 184, 0)';

  // Create the card
  const card = document.createElement('div');
  card.classList.add('transaction-card');
  card.style.borderColor = borderColor;

  card.innerHTML = `
    <div class="transaction-info">
        <div class="account-details">
            <p class="transaction-amount ${amountClass}">
                Transaction ${index + 1}:
                - ${accountName}
                - ${merchant_name || 'N/A'}
                - Amount: $${amount} ${iso_currency_code}
                - Date: ${date}
                - Category: ${formattedCategory}
            </p>
        </div>
    </div>
  `;

  return card;
}