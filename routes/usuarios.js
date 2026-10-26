const express = require("express");
const router = express.Router();
const DB = require("../db");
const bcrypt = require("bcrypt");

// CADASTRAR CLIENTE
router.post("/", async (req, res, next) => {
    try {
        const { nome, email, senha } = req.body;

        if (
            typeof nome !== "string" ||
            !nome.trim() ||
            typeof email !== "string" ||
            !email.trim() ||
            typeof senha !== "string" ||
            senha.length < 8
        ) {
            return res.status(400).json({
                erro: "Informe nome, email e senha com pelo menos 8 caracteres."
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const senhaHash = await bcrypt.hash(senha, 12);

        const resultado = await DB.query(
            `INSERT INTO usuarios (nome, email, senha, tipo)
             VALUES ($1, $2, $3, 'cliente')
             RETURNING id, nome, email, tipo, criado_em`,
            [nome.trim(), emailNormalizado, senhaHash]
        );

        res.status(201).json({
            mensagem: "Cliente cadastrado com sucesso.",
            usuario: resultado.rows[0]
        });
    } catch (erro) {
        if (erro.code === "23505") {
            return res.status(409).json({
                erro: "Este email já está cadastrado."
            });
        }

        next(erro);
    }
});

module.exports = router;
