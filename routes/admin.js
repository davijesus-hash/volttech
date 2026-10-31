const express = require("express");
const router = express.Router();
const DB = require("../db");

// MIDDLEWARE DE PROTEÇÃO
function requerAdmin(req, res, next) {
    return next();

    /* 
    if (req.session && req.session.usuario) {
        return next();
    }
    return res.redirect("/login");
    */

}

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
            totalProdutos = parseInt(resProd.rows[0]?.count || 0);
        } catch (e) { console.error("Aviso produtos:", e.message); }

        try {
            const resPed = await DB.query("SELECT COUNT(*) FROM pedidos");
            totalPedidos = parseInt(resPed.rows[0]?.count || 0);
        } catch (e) { console.error("Aviso pedidos:", e.message); }

        try {
            const resEst = await DB.query("SELECT id, nome, quantidade FROM produtos ORDER BY quantidade DESC LIMIT 8");
            produtosAltoEstoque = resEst.rows || [];
        } catch (e) { console.error("Aviso estoque:", e.message); }

        try {
            const resMov = await DB.query(`
                SELECT m.id, COALESCE(p.nome, 'Produto Removido') AS produto, m.tipo, m.quantidade, m.criado_em 
                FROM movimentacoes m
                LEFT JOIN produtos p ON p.id = m.produto_id
                ORDER BY m.criado_em DESC LIMIT 6
            `);
            movimentacoes = resMov.rows || [];
        } catch (e) { console.error("Aviso movimentacoes:", e.message); }

        try {
            const resUser = await DB.query("SELECT id, nome, email, COALESCE(situacao, 'Ativo') as situacao FROM usuarios ORDER BY id DESC");
            usuarios = resUser.rows || [];
        } catch (e) { console.error("Aviso usuarios:", e.message); }

        // Tenta renderizar 'admin/dashboard' e faz fallback para 'dashboard' se a estrutura de pastas for plana
        res.render("admin/dashboard", {
            vendasMes: 24500.0,
            totalPedidos,
            totalProdutos,
            produtosAltoEstoque,
            movimentacoes,
            usuarios
        }, (err, html) => {
            if (err) {
                // Caso a view esteja direto em views/dashboard.ejs e não em views/admin/dashboard.ejs
                return res.render("dashboard", {
                    vendasMes: 24500.0,
                    totalPedidos,
                    totalProdutos,
                    produtosAltoEstoque,
                    movimentacoes,
                    usuarios
                });
            }
            res.send(html);
        });
    } catch (erro) {
        console.error("Erro no dashboard:", erro);
        res.status(500).send("Erro ao carregar o painel administrativo.");
    }
});

// ==========================================
// 2. PRODUTOS / ESTOQUE ADMIN (/admin/produtos)
// ==========================================

// GET: Listar Produtos
router.get(["/produtos", "/estoque"], async (req, res) => {
    try {
        const resultado = await DB.query("SELECT * FROM produtos ORDER BY id DESC");
        res.render("admin/produtos-estoque", { produtos: resultado.rows });
    } catch (erro) {
        console.error("Erro ao carregar estoque:", erro);
        res.render("admin/produtos-estoque", { produtos: [] });
    }
});

// GET: Form Novo Produto
router.get("/produtos/novo", async (req, res) => {
    try {
        const categorias = await DB.query("SELECT * FROM categorias ORDER BY nome");
        res.render("admin/produto-form", { produto: null, categorias: categorias.rows });
    } catch (erro) {
        res.render("admin/produto-form", { produto: null, categorias: [] });
    }
});

// POST: Salvar Novo Produto (com Registro de Movimentação Inicial)
router.post("/produtos/salvar", async (req, res) => {
    const { nome, marca, preco, quantidade, qtd_minima, condicao, categoria_id, imagem_url } = req.body;
    try {
        const catId = categoria_id && categoria_id.toString().trim() !== "" ? parseInt(categoria_id) : null;
        const qtdInicial = parseInt(quantidade) || 0;

        // 1. Insere o produto novo e retorna o ID gerado
        const resProd = await DB.query(
            `INSERT INTO produtos (nome, marca, preco, quantidade, qtd_minima, condicao, categoria_id, imagem_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [
                nome, 
                marca || "VoltTech", 
                parseFloat(preco) || 0.0, 
                qtdInicial, 
                parseInt(qtd_minima) || 5, 
                condicao || "Excelente", 
                catId, 
                imagem_url || "https://via.placeholder.com/300"
            ]
        );

        // 2. Registra como 'entrada' no histórico de movimentações se a quantidade for maior que zero
        if (resProd.rows.length > 0 && qtdInicial > 0) {
            await DB.query(
                `INSERT INTO movimentacoes (produto_id, tipo, quantidade, criado_em)
                 VALUES ($1, 'entrada', $2, NOW())`,
                [resProd.rows[0].id, qtdInicial]
            );
        }

        res.redirect("/admin/produtos");
    } catch (erro) {
        console.error("Erro ao salvar novo produto:", erro);
        res.redirect("/admin/produtos/novo");
    }
});

// GET: Carregar Tela de Edição
router.get("/produtos/editar/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const produtoRes = await DB.query("SELECT * FROM produtos WHERE id = $1", [id]);
        if (produtoRes.rows.length === 0) {
            return res.redirect("/admin/produtos");
        }

        let categorias = [];
        try {
            const catRes = await DB.query("SELECT * FROM categorias ORDER BY nome");
            categorias = catRes.rows;
        } catch (e) {
            console.error("Aviso ao carregar categorias:", e.message);
        }

        res.render("admin/produto-editar", {
            produto: produtoRes.rows[0],
            categorias
        });
    } catch (erro) {
        console.error("Erro ao abrir tela de edição:", erro);
        res.redirect("/admin/produtos");
    }
});

// POST: Salvar Alterações da Edição
router.post("/produtos/editar/:id", async (req, res) => {
    const { id } = req.params;
    const { nome, marca, preco, condicao, quantidade, qtd_minima, imagem_url, categoria_id } = req.body;

    try {
        // 1. Busca a quantidade antiga para saber a diferença
        const prodAntigo = await DB.query("SELECT quantidade FROM produtos WHERE id = $1", [parseInt(id)]);
        const qtdAntiga = prodAntigo.rows[0] ? prodAntigo.rows[0].quantidade : 0;
        const novaQtd = parseInt(quantidade) || 0;
        const diferenca = novaQtd - qtdAntiga;

        const catId = categoria_id && categoria_id.toString().trim() !== "" ? parseInt(categoria_id) : null;

        // 2. Atualiza o produto
        await DB.query(`
            UPDATE produtos 
            SET nome = $1, 
                marca = $2, 
                preco = $3, 
                condicao = $4, 
                quantidade = $5, 
                qtd_minima = $6, 
                imagem_url = $7,
                categoria_id = $8
            WHERE id = $9
        `, [
            nome, 
            marca || 'VoltTech', 
            parseFloat(preco) || 0.0, 
            condicao || 'Excelente', 
            novaQtd, 
            parseInt(qtd_minima) || 5, 
            imagem_url || 'https://via.placeholder.com/300', 
            catId, 
            parseInt(id)
        ]);

        // 3. Se a quantidade mudou, grava no histórico de Movimentações!
        if (diferenca !== 0) {
            const tipo = diferenca > 0 ? 'entrada' : 'saida';
            await DB.query(
                `INSERT INTO movimentacoes (produto_id, tipo, quantidade, criado_em)
                 VALUES ($1, $2, $3, NOW())`,
                [parseInt(id), tipo, Math.abs(diferenca)]
            );
        }

        res.redirect("/admin/produtos");
    } catch (erro) {
        console.error("Erro ao atualizar produto:", erro);
        res.redirect("/admin/produtos");
    }
});

// POST: Remover Produto
router.post("/produtos/deletar/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await DB.query("DELETE FROM produtos WHERE id = $1", [parseInt(id)]);
        res.redirect("/admin/produtos");
    } catch (erro) {
        console.error("Erro ao deletar produto:", erro);
        res.redirect("/admin/produtos");
    }
});

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
        await DB.query(
            "INSERT INTO usuarios (nome, email, senha, situacao, permissao) VALUES ($1, $2, $3, $4, 'admin')",
            [nome, email, senha || "123456", situacao || "Ativo"]
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

// ==========================================
// 5. FALE CONOSCO / CONTATO (/admin/contato)
// ==========================================
router.get("/contato", (req, res) => {
    res.render("admin/contato", { mensagens: [] });
});

module.exports = router;