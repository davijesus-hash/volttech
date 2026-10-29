const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const DB = require("../db");

// Middleware de Proteção: Garante que exista uma sessão ativa
function requerAdmin(req, res, next) {
    if (req.session && req.session.usuario) {
        return next();
    }
    return res.redirect("/login");
}

router.use(requerAdmin);
router.use(requerAdmin);

// ==========================================
// 1. DASHBOARD (/admin/dashboard)
// ==========================================
router.get("/dashboard", async (req, res) => {
    try {
        let totalProdutos = 0;
        let totalPedidos = 0;
        let produtosAltoEstoque = [];
        let movimentacoes = [];
        let usuarios = [];

        try {
            const resProd = await DB.query("SELECT COUNT(*) FROM produtos");
            totalProdutos = resProd.rows[0].count || 0;
        } catch (e) { console.error("Aviso produtos:", e.message); }

        try {
            const resPed = await DB.query("SELECT COUNT(*) FROM pedidos");
            totalPedidos = resPed.rows[0].count || 0;
        } catch (e) { console.error("Aviso pedidos:", e.message); }

        try {
            const resEst = await DB.query("SELECT nome, quantidade FROM produtos ORDER BY quantidade DESC LIMIT 8");
            produtosAltoEstoque = resEst.rows;
        } catch (e) { console.error("Aviso estoque:", e.message); }

        try {
            const resMov = await DB.query(`
                SELECT m.id, p.nome AS produto, m.tipo, m.quantidade, m.criado_em 
                FROM movimentacoes m
                LEFT JOIN produtos p ON p.id = m.produto_id
                ORDER BY m.criado_em DESC LIMIT 6
            `);
            movimentacoes = resMov.rows;
        } catch (e) { console.error("Aviso movimentacoes:", e.message); }

        try {
            const resUser = await DB.query("SELECT id, nome, email, COALESCE(situacao, 'Ativo') as situacao FROM usuarios ORDER BY id DESC");
            usuarios = resUser.rows;
        } catch (e) { console.error("Aviso usuarios:", e.message); }

        res.render("dashboard", {
            vendasMes: 24500.0,
            totalPedidos,
            totalProdutos,
            produtosAltoEstoque,
            movimentacoes,
            usuarios
        });
    } catch (erro) {
        console.error("Erro no dashboard:", erro);
        res.status(500).send("Erro ao carregar o painel administrativo.");
    }
});

// ==========================================
// 2. PRODUTOS / ESTOQUE ADMIN (/admin/produtos e /admin/estoque)
// ==========================================
router.get(["/produtos", "/estoque"], async (req, res) => {
    try {
        const resultado = await DB.query("SELECT * FROM produtos ORDER BY id DESC");
        res.render("admin/produtos-estoque", { produtos: resultado.rows });
    } catch (erro) {
        console.error("Erro ao carregar estoque:", erro);
        res.render("admin/produtos-estoque", { produtos: [] });
    }
});

router.get("/produtos/novo", async (req, res) => {
    try {
        const categorias = await DB.query("SELECT * FROM categorias ORDER BY nome");
        res.render("admin/produto-form", { produto: null, categorias: categorias.rows });
    } catch (erro) {
        res.render("admin/produto-form", { produto: null, categorias: [] });
    }
});

router.post("/produtos/salvar", async (req, res) => {
    const { nome, marca, preco, quantidade, qtd_minima, condicao, categoria_id, imagem_url } = req.body;
    try {
        await DB.query(
            `INSERT INTO produtos (nome, marca, preco, quantidade, qtd_minima, condicao, categoria_id, imagem_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [nome, marca || "VoltTech", preco, quantidade || 0, qtd_minima || 5, condicao || "Excelente", categoria_id || null, imagem_url || "https://via.placeholder.com/300"]
        );
        res.redirect("/admin/produtos");
    } catch (erro) {
        console.error("Erro ao salvar produto:", erro);
        res.redirect("/admin/produtos/novo");
    }
});

router.get("/produtos/editar/:id", (req, res) => res.redirect("/admin/produtos"));

// ==========================================
// 3. USUÁRIOS (/admin/usuarios)
// ==========================================
router.get("/usuarios", async (req, res) => {
    try {
        const resultado = await DB.query("SELECT id, nome, email, COALESCE(situacao, 'Ativo') AS situacao FROM usuarios ORDER BY id ASC");
        res.render("admin/usuarios-lista", { usuarios: resultado.rows });
    } catch (erro) {
        res.render("admin/usuarios-lista", { usuarios: [] });
    }
});

router.get("/usuarios/novo", (req, res) => res.render("admin/usuario-form"));

router.post("/usuarios/salvar", async (req, res) => {
    const { nome, email, senha, situacao } = req.body;
    try {
        const senhaHash = await bcrypt.hash(senha || "123456", 10);
        await DB.query(
            "INSERT INTO usuarios (nome, email, senha, situacao, permissao) VALUES ($1, $2, $3, $4, 'admin')",
            [nome, email, senhaHash, situacao || "Ativo"]
        );
        res.redirect("/admin/usuarios");
    } catch (erro) {
        res.redirect("/admin/usuarios/novo");
    }
});

// ==========================================
// 4. CATEGORIAS (/admin/categorias)
// ==========================================
router.get("/categorias", async (req, res) => {
    try {
        const resultado = await DB.query("SELECT * FROM categorias ORDER BY id ASC");
        res.render("admin/categorias-lista", { categorias: resultado.rows });
    } catch (erro) {
        res.render("admin/categorias-lista", { categorias: [] });
    }
});

router.get("/categorias/nova", (req, res) => res.render("admin/categoria-form"));

router.post("/categorias/salvar", async (req, res) => {
    const { nome, descricao, imagem_url } = req.body;
    try {
        await DB.query(
            "INSERT INTO categorias (nome, descricao, imagem_url) VALUES ($1, $2, $3)",
            [nome, descricao, imagem_url || null]
        );
        res.redirect("/admin/categorias");
    } catch (erro) {
        res.redirect("/admin/categorias/nova");
    }
});

router.get("/categorias/editar/:id", (req, res) => res.redirect("/admin/categorias"));

// ==========================================
// 5. FALE CONOSCO / CONTATO (/admin/contato)
// ==========================================
router.get("/contato", (req, res) => {
    res.render("admin/contato", { mensagens: [] });
});

module.exports = router;