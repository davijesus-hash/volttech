const express = require("express");
const router = express.Router();
const DB = require("../db");

// LISTAR PRODUTOS
router.get("/", async (req, res, next) => {
    try {
        const resultado = await DB.query(
            `SELECT p.*, c.nome AS categoria
             FROM produtos p
             LEFT JOIN categorias c ON p.categoria_id = c.id
             WHERE p.ativo = TRUE
             ORDER BY p.id`
        );

        res.json(resultado.rows);
    } catch (erro) {
        next(erro);
    }
});

// CONSULTAR UM PRODUTO PELO ID
router.get("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: "ID inválido."
            });
        }

        const resultado = await DB.query(
            `SELECT * FROM produtos
             WHERE id = $1 AND ativo = TRUE`,
            [id]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: "Produto não encontrado."
            });
        }

        res.json(resultado.rows[0]);
    } catch (erro) {
        next(erro);
    }
});

// CADASTRAR PRODUTO
router.post("/", async (req, res, next) => {
    try {
        const {
            nome, descricao, marca, condicao,
            preco, quantidade, categoria_id
        } = req.body;

        const precoNumero = Number(preco);
        const quantidadeNumero = Number(quantidade);
        const categoriaNumero = Number(categoria_id);

        if (!nome || !nome.trim()) {
            return res.status(400).json({
                erro: "O nome do produto é obrigatório."
            });
        }

        if (!["Excelente", "Muito bom", "Bom"].includes(condicao)) {
            return res.status(400).json({
                erro: "Condição do produto inválida."
            });
        }

        if (!Number.isFinite(precoNumero) || precoNumero < 0) {
            return res.status(400).json({
                erro: "O preço deve ser um número positivo ou zero."
            });
        }

        if (!Number.isInteger(quantidadeNumero) || quantidadeNumero < 0) {
            return res.status(400).json({
                erro: "A quantidade deve ser um inteiro não negativo."
            });
        }

        if (!Number.isInteger(categoriaNumero) || categoriaNumero <= 0) {
            return res.status(400).json({
                erro: "Informe uma categoria válida."
            });
        }

        const resultado = await DB.query(
            `INSERT INTO produtos
             (nome, descricao, marca, condicao, preco,
              quantidade, categoria_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                nome.trim(), descricao || null, marca || null,
                condicao, precoNumero, quantidadeNumero,
                categoriaNumero
            ]
        );

        res.status(201).json(resultado.rows[0]);
    } catch (erro) {
        if (erro.code === "23503") {
            return res.status(400).json({
                erro: "A categoria informada não existe."
            });
        }

        next(erro);
    }
});

// ATUALIZAR PRODUTO
router.put("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const {
            nome, descricao, marca, condicao,
            preco, quantidade, categoria_id
        } = req.body;

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: "ID inválido."
            });
        }

        if (
            !nome || !nome.trim() ||
            !["Excelente", "Muito bom", "Bom"].includes(condicao) ||
            preco === undefined || preco === null ||
            !Number.isFinite(Number(preco)) || Number(preco) < 0 ||
            !Number.isInteger(Number(quantidade)) ||
            Number(quantidade) < 0 ||
            !Number.isInteger(Number(categoria_id)) ||
            Number(categoria_id) <= 0
        ) {
            return res.status(400).json({
                erro: "Confira os campos obrigatórios do produto."
            });
        }

        const resultado = await DB.query(
            `UPDATE produtos
             SET nome = $1, descricao = $2, marca = $3,
                 condicao = $4, preco = $5,
                 quantidade = $6, categoria_id = $7
             WHERE id = $8 AND ativo = TRUE
             RETURNING *`,
            [
                nome.trim(), descricao || null, marca || null,
                condicao, Number(preco), Number(quantidade),
                Number(categoria_id), id
            ]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: "Produto não encontrado."
            });
        }

        res.json(resultado.rows[0]);
    } catch (erro) {
        if (erro.code === "23503") {
            return res.status(400).json({
                erro: "A categoria informada não existe."
            });
        }

        next(erro);
    }
});

// DESATIVAR PRODUTO SEM APAGAR O HISTÓRICO
router.delete("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: "ID inválido."
            });
        }

        const resultado = await DB.query(
            `UPDATE produtos
             SET ativo = FALSE
             WHERE id = $1 AND ativo = TRUE
             RETURNING id`,
            [id]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: "Produto não encontrado."
            });
        }

        res.json({
            mensagem: "Produto desativado com sucesso."
        });
    } catch (erro) {
        next(erro);
    }
});

module.exports = router;