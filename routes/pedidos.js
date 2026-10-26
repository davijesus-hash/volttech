const express = require("express");
const router = express.Router();
const DB = require("../db");

// REGISTRAR PEDIDO
router.post("/", async (req, res, next) => {
    const { usuario_id, itens } = req.body;
    const usuarioId = Number(usuario_id);

    if (
        !Number.isInteger(usuarioId) ||
        usuarioId <= 0 ||
        !Array.isArray(itens) ||
        itens.length === 0
    ) {
        return res.status(400).json({
            erro: "Informe um cliente válido e pelo menos um item."
        });
    }

    // Valida os itens antes de abrir a transação.
    const quantidades = new Map();

    for (const item of itens) {
        const produtoId = Number(item.produto_id);
        const quantidade = Number(item.quantidade);

        if (
            !Number.isInteger(produtoId) || produtoId <= 0 ||
            !Number.isInteger(quantidade) || quantidade <= 0
        ) {
            return res.status(400).json({
                erro: "Cada item precisa de produto e quantidade válidos."
            });
        }

        quantidades.set(
            produtoId,
            (quantidades.get(produtoId) || 0) + quantidade
        );
    }

    const cliente = await DB.connect();

    try {
        await cliente.query("BEGIN");

        const usuario = await cliente.query(
            "SELECT id FROM usuarios WHERE id = $1",
            [usuarioId]
        );

        if (usuario.rowCount === 0) {
            await cliente.query("ROLLBACK");
            return res.status(404).json({
                erro: "Cliente não encontrado."
            });
        }

        let total = 0;
        const itensConfirmados = [];

        // Ordenar os IDs ajuda a manter uma ordem de bloqueio consistente.
        const ids = [...quantidades.keys()].sort((a, b) => a - b);

        for (const produtoId of ids) {
            const quantidade = quantidades.get(produtoId);

            const resultado = await cliente.query(
                `SELECT id, nome, preco, quantidade
                 FROM produtos
                 WHERE id = $1 AND ativo = TRUE
                 FOR UPDATE`,
                [produtoId]
            );

            if (resultado.rowCount === 0) {
                throw Object.assign(
                    new Error("Produto " + produtoId + " não encontrado."),
                    { status: 400 }
                );
            }

            const produto = resultado.rows[0];

            if (produto.quantidade < quantidade) {
                throw Object.assign(
                    new Error("Estoque insuficiente para " + produto.nome + "."),
                    { status: 409 }
                );
            }

            const preco = Number(produto.preco);
            total += preco * quantidade;

            itensConfirmados.push({
                produto_id: produto.id,
                quantidade: quantidade,
                preco_unitario: produto.preco
            });
        }

        const pedido = await cliente.query(
            `INSERT INTO pedidos (usuario_id, total)
             VALUES ($1, $2)
             RETURNING *`,
            [usuarioId, total.toFixed(2)]
        );

        const pedidoId = pedido.rows[0].id;

        for (const item of itensConfirmados) {
            await cliente.query(
                `INSERT INTO itens_pedido
                 (pedido_id, produto_id, quantidade, preco_unitario)
                 VALUES ($1, $2, $3, $4)`,
                [
                    pedidoId,
                    item.produto_id,
                    item.quantidade,
                    item.preco_unitario
                ]
            );

            await cliente.query(
                `UPDATE produtos
                 SET quantidade = quantidade - $1
                 WHERE id = $2`,
                [item.quantidade, item.produto_id]
            );

            await cliente.query(
                `INSERT INTO movimentacoes_estoque
                 (produto_id, tipo, quantidade, motivo)
                 VALUES ($1, 'Saida', $2, $3)`,
                [
                    item.produto_id,
                    item.quantidade,
                    "Pedido #" + pedidoId
                ]
            );
        }

        await cliente.query("COMMIT");

        res.status(201).json({
            mensagem: "Pedido registrado com sucesso.",
            pedido: pedido.rows[0],
            itens: itensConfirmados
        });
    } catch (erro) {
        await cliente.query("ROLLBACK");

        if (erro.status) {
            return res.status(erro.status).json({
                erro: erro.message
            });
        }

        next(erro);
    } finally {
        cliente.release();
    }
});

// CONSULTAR PEDIDOS
router.get("/", async (req, res, next) => {
    try {
        const resultado = await DB.query(
            `SELECT p.id, p.usuario_id, u.nome AS cliente,
                    p.total, p.status, p.criado_em
             FROM pedidos p
             JOIN usuarios u ON u.id = p.usuario_id
             ORDER BY p.id DESC`
        );

        res.json(resultado.rows);
    } catch (erro) {
        next(erro);
    }
});

module.exports = router;
