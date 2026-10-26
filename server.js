const express = require("express");
require("dotenv").config();

const DB = require("./db");

const app = express();

// Permite receber requisições com dados JSON.
app.use(express.json());

// Importa as rotas.
const produtosRoutes = require("./routes/produtos");
const categoriasRoutes = require("./routes/categorias");
const usuariosRoutes = require("./routes/usuarios");
const pedidosRoutes = require("./routes/pedidos");
const estoqueRoutes = require("./routes/estoque");
const path = require("path");

app.use(express.static(path.join(__dirname, "Public")));

// Rota inicial.
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "index.html"));
});

// Verifica a conexão com o banco.
app.get("/api/saude", async (req, res) => {
    try {
        await DB.query("SELECT 1");

        res.json({
            servidor: "online",
            banco: "conectado"
        });
    } catch (erro) {
        res.status(503).json({
            servidor: "online",
            banco: "indisponível"
        });
    }
});

// Registra as rotas.
app.use("/api/produtos", produtosRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/estoque", estoqueRoutes);

// Rota inexistente.
app.use((req, res) => {
    res.status(404).json({
        erro: "Rota não encontrada."
    });
});

// Tratamento centralizado de erros.
app.use((erro, req, res, next) => {
    console.error(erro);

    res.status(500).json({
        erro: "Ocorreu um erro interno no servidor."
    });
});

// Inicia o servidor.
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("VoltTech rodando em http://localhost:" + PORT);
});