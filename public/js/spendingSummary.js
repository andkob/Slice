// Fetch transaction data and create pie chart
export const showSpendingSummary = async function (transactionData) {
    try {
        const transactions = transactionData.added;

        // Aggregate spending by category
        const categorySpending = {};
        transactions.forEach(transaction => {
            const category = transaction.category ? transaction.category[0] : 'Uncategorized';
            const amount = Math.abs(transaction.amount); // Ensure positive amounts for spending

            if (!categorySpending[category]) {
                categorySpending[category] = 0;
            }
            categorySpending[category] += amount;
        });

        // Prepare data for the pie chart
        const categories = Object.keys(categorySpending);
        const amounts = Object.values(categorySpending);

        // Get today's date and calculate the date 7 days ago
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set time to midnight
        const minimumDayBack = new Date();
        minimumDayBack.setHours(0, 0, 0, 0);
        const amtDaysBack = 7;
        minimumDayBack.setDate(today.getDate() - amtDaysBack);

        // Generate an array of dates for the last specified amt of days
        const dates = [];
        for (let day = minimumDayBack; day <= today; day.setDate(day.getDate() + 1)) {
            dates.push(new Date(day).toISOString().split('T')[0]); // convert date obj to string format "YYYY-MM-DD" and push
        }

        // Initialize daily spending data with zero
        const dailySpendingData = {};
        dates.forEach(date => {
            dailySpendingData[date] = 0;
        });

        // Update the spending data for dates with transactions
        transactions.forEach(transaction => {
            const dateString = transaction.date;
            // don't display income
            if (dailySpendingData.hasOwnProperty(dateString) && transaction.amount > 0) {
                dailySpendingData[dateString] += transaction.amount;
            }
        });

        const dailyAmounts = dates.map(date => dailySpendingData[date]);

        // Create the pie chart
        const pieCtx = document.getElementById('spendingPieChart').getContext('2d');
        new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Spending by Category',
                    data: amounts,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.raw);
                                
                                // Calculate percentage
                                const dataset = context.chart.data.datasets[context.datasetIndex];
                                const total = dataset.data.reduce((acc, value) => acc + value, 0);
                                const percentage = Math.round((context.raw / total) * 100);
        
                                label += ` (${percentage}%)`;
                                return label;
                            }
                        }
                    }
                }
            }
        });

        // Create the line chart
        const lineCtx = document.getElementById('spendingLineChart').getContext('2d');
        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Daily Spending',
                    data: dailyAmounts,
                    fill: false,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.raw);
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Amount ($)'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error fetching transaction data: ', error);
    }
};