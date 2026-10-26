const express = require("express");
const router = express.Router();
const DB = require("../db");

// LISTAR CATEGORIAS
router.get("/", async (req, res, next) => {
    try {
        const resultado = await DB.query(
            "SELECT * FROM categorias ORDER BY nome"
        );

        res.json(resultado.rows);
    } catch (erro) {
        next(erro);
    }
});

// CADASTRAR CATEGORIA
router.post("/", async (req, res, next) => {
    try {
        const { nome, descricao } = req.body;

        if (!nome || !nome.trim()) {
            return res.status(400).json({
                erro: "O nome da categoria é obrigatório."
            });
        }

        const resultado = await DB.query(
            `INSERT INTO categorias (nome, descricao)
             VALUES ($1, $2)
             RETURNING *`,
            [nome.trim(), descricao || null]
        );

        res.status(201).json(resultado.rows[0]);
    } catch (erro) {
        if (erro.code === "23505") {
            return res.status(409).json({
                erro: "Essa categoria já existe."
            });
        }

        next(erro);
    }
});

module.exports = router;
