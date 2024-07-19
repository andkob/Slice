<p align="center">
  <img src="images/Slice-Logo-long.png" alt="Slice Logo Banner">
</p>

# Slice Finance Assistant
This project is a lightweight, client-server based application designed to manage personal finances. This project serves as a practice platform for developing applications that integrate with APIs, specifically the Plaid API. It includes essential features such as recent transactions and budgeting tools. The application is structured to facilitate the easy addition of new features and supports the integration of all Plaid products for further enhancement.

## Features

- **Recent Transactions**: View a detailed list of your recent financial transactions.
- **Budgeting Tools**: Basic budgeting features to help you manage your finances.
- **API Integration**: Uses the Plaid API to fetch and display transaction data.
- **Comprehensive Visuals**: Visualization of spending habits over time
- **UI**: Responsive and user-friendly interface
- **Extensible Design**: Structured to allow developers to easily add new features.

## Technologies Used

- **Frontend:** HTML, CSS, JavaScript, Chart.js
- **Backend:** Node.js, Express.js, SQLite
- **API:** Plaid API

## Sandbox Mode

This project uses Plaid's sandbox environment, which provides test data to simulate interactions with financial institutions. The data returned by the API in sandbox mode is not real and is only meant for testing and development purposes. This allows developers to experiment with the application without needing access to real bank accounts.

## Getting Started

### Prerequisites

- Node.js
- npm (Node Package Manager)
- Plaid API keys (sandbox or live)

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/andkob/Slice.git
    cd Slice
    ```

2. Install the dependencies:
    ```bash
    npm install
    ```

3. Set up environment variables:
    Create a `.env` file in the root directory and add your Plaid API keys:
    ```env
    PLAID_CLIENT_ID=your_client_id
    PLAID_SECRET=your_secret
    PLAID_ENV=sandbox_or_production
    ```
    *Note: The project is currently hardcoded to use the **sandbox** environment. See Line 96 in server.js:/plaidConfig*

### Running the Application

1. Start the server:
    ```bash
    node server.js
    ```

2. Open your browser and navigate to `http://localhost:3000` to view the application.

### Usage

1. **Homepage and Initial Login**:
    - Upon reaching the homepage, you will be prompted to enter a username.
    - If logging in for the first time, click the button to connect your bank. This will initiate the 'Plaid Link' application, which will guide you through the process of connecting your bank.
    - In sandbox mode, use the following credentials to log in:
        - **Username**: `user_good`
        - **Password**: `pass_good`
        - **Verification code**: `1234` (if applicable)

2. **Dashboard Overview**:
    - After logging in, you will be directed to the dashboard, which has three main tabs:
        - **Quick Links**: Most quick links will display information in the output box at the bottom of the page.
        - **Recent Transactions**: View your most recent financial transactions.
        - **Spending Summary**: A summary of your spending habits.
    - Explore additional features:
        - The "Transactions Overview" button will take you to a detailed transactions page.
        - Feel free to navigate and explore the rest of the application!