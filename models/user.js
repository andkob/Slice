const { DataTypes, Sequelize } = require('sequelize');
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.sqlite', // path to the SQLite database file
});

const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    access_token: {
        type: DataTypes.STRING,
    },
    user_status: {
        type: DataTypes.STRING,
    },
    connected_bank: {
        type: DataTypes.STRING,
    }
});

module.exports = User;