const express = require("express");
const router = express.Router();
const DB = require("../db");

// CONSULTAR ESTOQUE
router.get("/", async (req, res, next) => {
    try {
        const resultado = await DB.query(
            `SELECT id, nome, quantidade
             FROM produtos
             WHERE ativo = TRUE
             ORDER BY nome`
        );

        res.json(resultado.rows);
    } catch (erro) {
        next(erro);
    }
});

// REGISTRAR ENTRADA OU SAÍDA
router.post("/movimentacoes", async (req, res, next) => {
    const { produto_id, tipo, quantidade, motivo } = req.body;

    const produtoId = Number(produto_id);
    const qtd = Number(quantidade);

    if (
        !Number.isInteger(produtoId) || produtoId <= 0 ||
        !Number.isInteger(qtd) || qtd <= 0 ||
        !["Entrada", "Saida"].includes(tipo)
    ) {
        return res.status(400).json({
            erro: "Informe produto, quantidade positiva e tipo válido."
        });
    }

    const cliente = await DB.connect();

    try {
        await cliente.query("BEGIN");

        const produto = await cliente.query(
            `SELECT quantidade
             FROM produtos
             WHERE id = $1 AND ativo = TRUE
             FOR UPDATE`,
            [produtoId]
        );

        if (produto.rowCount === 0) {
            await cliente.query("ROLLBACK");
            return res.status(404).json({
                erro: "Produto não encontrado."
            });
        }

        const atual = produto.rows[0].quantidade;

        if (tipo === "Saida" && atual < qtd) {
            await cliente.query("ROLLBACK");
            return res.status(409).json({
                erro: "Estoque insuficiente."
            });
        }

        const variacao = tipo === "Entrada" ? qtd : -qtd;

        await cliente.query(
            `UPDATE produtos
             SET quantidade = quantidade + $1
             WHERE id = $2`,
            [variacao, produtoId]
        );

        const movimentacao = await cliente.query(
            `INSERT INTO movimentacoes_estoque
             (produto_id, tipo, quantidade, motivo)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [produtoId, tipo, qtd, motivo || null]
        );

        await cliente.query("COMMIT");

        res.status(201).json({
            mensagem: "Movimentação registrada com sucesso.",
            movimentacao: movimentacao.rows[0]
        });
    } catch (erro) {
        await cliente.query("ROLLBACK");
        next(erro);
    } finally {
        cliente.release();
    }
});

module.exports = router;
