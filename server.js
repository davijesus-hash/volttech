const express = require("express");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

const DB = require("./db");

const app = express();

// ==========================================
// CONFIGURAÇÕES E MIDDLEWARES GERAIS
// ==========================================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "Public")));

// Sessão do Usuário
app.use(
  session({
    secret: process.env.SESSION_SECRET || "volttech_chave_secreta_segura",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8 horas
  })
);

// Disponibiliza o usuário para as telas EJS
app.use((req, res, next) => {
  res.locals.usuarioLogado = req.session.usuario || null;
  next();
});

// Importação dos Módulos de Rotas
const adminRoutes = require("./routes/admin");
const produtosRoutes = require("./routes/produtos");
const categoriasRoutes = require("./routes/categorias");
const usuariosRoutes = require("./routes/usuarios");
const pedidosRoutes = require("./routes/pedidos");
const estoqueRoutes = require("./routes/estoque");

// ==========================================
// ROTAS MÓDULO ADMINISTRATIVO (/admin)
// ==========================================
app.use("/admin", adminRoutes);

// ==========================================
// ROTAS PÚBLICAS DA LOJA (CLIENTE)
// ==========================================

// Landing Page
app.get("/", async (req, res) => {
  try {
    const resultado = await DB.query("SELECT * FROM produtos LIMIT 6");
    res.render("index", { produtos: resultado.rows });
  } catch (erro) {
    res.render("index", { produtos: [] });
  }
});

// Catálogo Público (Apenas Visualização para Clientes)
app.get("/produtos", async (req, res) => {
  try {
    const resultado = await DB.query("SELECT * FROM produtos ORDER BY id DESC");
    res.render("produtos-publico", { produtos: resultado.rows });
  } catch (erro) {
    res.status(500).send("Erro ao carregar o catálogo de produtos.");
  }
});

// ==========================================
// ROTAS DE AUTENTICAÇÃO (LOGIN / LOGOUT)
// ==========================================

// GET: Tela de Login
app.get("/login", (req, res) => {
  if (req.session && req.session.usuario) {
    return res.redirect("/admin/dashboard");
  }
  res.render("login", { erro: null });
});

// POST: Processar Login 
app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    const resultado = await DB.query(
      `SELECT id, nome, email
       FROM usuarios 
       WHERE LOWER(email) = LOWER($1) 
         AND senha = $2`,
      [email ? email.trim() : '', senha]
    );

    if (resultado.rows.length === 0) {
      return res.render("login", {
        erro: "E-mail ou senha inválidos"
      });
    }

    // Grava a sessão com os dados do utilizador
    req.session.usuario = resultado.rows[0];

    return res.redirect("/admin/dashboard");
  } catch (erro) {
    console.error("Erro no login:", erro);
    return res.render("login", {
      erro: "Erro interno ao processar o login."
    });
  }
});

// GET: Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ==========================================
// ROTAS DE API REST & STATUS
// ==========================================

app.get("/api/saude", async (req, res) => {
  try {
    await DB.query("SELECT 1");
    res.json({ servidor: "online", banco: "conectado" });
  } catch (erro) {
    res.status(503).json({ servidor: "online", banco: "indisponível" });
  }
});

app.use("/api/produtos", produtosRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/estoque", estoqueRoutes);

// ==========================================
// TRATAMENTO DE ERROS E 404
// ==========================================

app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

app.use((erro, req, res, next) => {
  console.error(erro);
  res.status(500).json({ erro: "Erro interno no servidor." });
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`VoltTech rodando em http://localhost:${PORT}`);
});