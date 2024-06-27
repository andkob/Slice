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

        // Create the pie chart
        const ctx = document.getElementById('spendingChart').getContext('2d');
        new Chart(ctx, {
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
    } catch (error) {
        console.error('Error fetching transaction data: ', error);
    }
};