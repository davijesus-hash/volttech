const { Pool } = require("pg");
require("dotenv").config();

const DB = new Pool({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "admin",
    database: "volttech"
});

// Exporta a conexão para ser usada pelas rotas.
module.exports = DB;
