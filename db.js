const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.sqlite', // path to SQLite database file
});

const User = require('./models/user'); // Import user model

const initDB = async () => {
    try {
        sequelize.authenticate();
        console.log('Connection to database has been established successfully.');

        // Define your models and relationships here
        await User.sync(); // This creates the User table if it doesn't exist

        console.log('All models were synchronized successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

module.exports = {
    sequelize,
    initDB,
    User, // Export your models for use in other parts of your application
};
