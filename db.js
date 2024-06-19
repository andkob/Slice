const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.sqlite', // path to SQLite database file
});

const User = require('./models/user'); // Import user model

const initDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection to database has been established successfully.');

        // Define your models and relationships here
        await User.sync(); // This creates the User table if it doesn't exist

        console.log('All models were synchronized successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

async function findOrCreateUser(username) {
    try{
        const [user, created] = await User.findOrCreate({
            where: { username },
            defaults: {
                access_token: null,
                user_status: 'not_connected'
            }
        });
        
        if (!created) {
            console.log('User already exists: ', user.toJSON());
        } else {
            console.log('New user created:', user.toJSON());
        }

        return user;
    } catch(error) {
        console.error('Error finding or creating user:', error);
        throw error;
    }
}

module.exports = {
    sequelize,
    initDB,
    findOrCreateUser,
    User, // Export your models for use in other parts of your application
};
