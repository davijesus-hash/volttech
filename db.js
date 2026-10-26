const { Pool } = require("pg");
require("dotenv").config();

const DB = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

// Exporta a conexão para ser usada pelas rotas.
module.exports = DB;
