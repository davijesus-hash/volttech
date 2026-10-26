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

// Middleware temporário de bypass / verificação de Admin
function requerAdmin(req, res, next) {
  // Se ainda não estiver logado, faz login automático temporário para desenvolvimento
  if (!req.session || !req.session.usuario) {
    req.session.usuario = {
      id: 1,
      nome: "Administrador (Dev)",
      email: "admin@volttech.com.br",
      permissao: "admin"
    };
  }
  return next();
}

// Disponibiliza o usuário para as telas EJS
app.use((req, res, next) => {
  res.locals.usuarioLogado = req.session.usuario || null;
  next();
});

// Módulos de API
const produtosRoutes = require("./routes/produtos");
const categoriasRoutes = require("./routes/categorias");
const usuariosRoutes = require("./routes/usuarios");
const pedidosRoutes = require("./routes/pedidos");
const estoqueRoutes = require("./routes/estoque");

// ==========================================
// ROTAS DE AUTENTICAÇÃO (MODO DEVTMP AUTO-LOGIN)
// ==========================================

// GET: Página de Login (Redireciona direto para o Dashboard com login automático)
app.get("/admin/login", (req, res) => {
  req.session.usuario = {
    id: 1,
    nome: "Administrador (Dev)",
    email: "admin@volttech.com.br",
    permissao: "admin"
  };
  res.redirect("/admin/dashboard");
});

// POST: Login Manual (Entra automático também)
app.post("/admin/login", (req, res) => {
  req.session.usuario = {
    id: 1,
    nome: "Administrador (Dev)",
    email: "admin@volttech.com.br",
    permissao: "admin"
  };
  res.redirect("/admin/dashboard");
});

// GET: Encerrar sessão (Logout)
app.get("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// POST: Criar Novo Administrador (Futuro)
app.post("/admin/usuarios/novo", requerAdmin, async (req, res) => {
  const { nome, email, senha } = req.body;
  try {
    await DB.query(
      "INSERT INTO usuarios (nome, email, senha, permissao) VALUES ($1, $2, $3, 'admin')",
      [nome, email, senha || "123456"]
    );
    res.redirect("/admin/dashboard");
  } catch (erro) {
    console.error("Erro ao cadastrar administrador:", erro);
    res.redirect("/admin/dashboard");
  }
});

// ==========================================
// ROTAS DE VISUALIZAÇÃO (EJS)
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

// Catálogo de Produtos
app.get("/produtos", async (req, res) => {
  try {
    const resultado = await DB.query("SELECT * FROM produtos ORDER BY id DESC");
    res.render("produtos", {
      produtos: resultado.rows,
      totalProdutos: resultado.rowCount
    });
  } catch (erro) {
    res.status(500).send("Erro ao carregar o catálogo de produtos.");
  }
});

// Dashboard Administrativo
app.get("/admin/dashboard", requerAdmin, async (req, res) => {
  try {
    const resultadoProdutos = await DB.query("SELECT COUNT(*) FROM produtos");
    const resultadoPedidos = await DB.query("SELECT COUNT(*) FROM pedidos");
    
    const resultadoEstoque = await DB.query(
      "SELECT nome, quantidade FROM produtos ORDER BY quantidade DESC LIMIT 8"
    );

    let movimentacoes = [];
    try {
      const resMov = await DB.query(`
        SELECT m.id, p.nome AS produto, m.tipo, m.quantidade, m.criado_em 
        FROM movimentacoes m
        LEFT JOIN produtos p ON p.id = m.produto_id
        ORDER BY m.criado_em DESC LIMIT 6
      `);
      movimentacoes = resMov.rows;
    } catch (e) {
      movimentacoes = [];
    }

    let usuarios = [];
    try {
      const resUser = await DB.query("SELECT id, nome, email FROM usuarios ORDER BY id DESC");
      usuarios = resUser.rows;
    } catch (e) {
      usuarios = [];
    }

    res.render("dashboard", {
      vendasMes: 24500.0,
      totalPedidos: resultadoPedidos.rows[0].count || 0,
      totalProdutos: resultadoProdutos.rows[0].count || 0,
      produtosAltoEstoque: resultadoEstoque.rows,
      movimentacoes: movimentacoes,
      usuarios: usuarios
    });
  } catch (erro) {
    console.error("Erro no dashboard:", erro);
    res.status(500).send("Erro ao carregar o painel administrativo.");
  }
});

// ==========================================
// ROTAS DA API & ERROS
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

app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

app.use((erro, req, res, next) => {
  console.error(erro);
  res.status(500).json({ erro: "Erro interno no servidor." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`VoltTech rodando em http://localhost:${PORT}`);
});