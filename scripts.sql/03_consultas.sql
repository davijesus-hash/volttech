-- Consultar todas as tabelas
SELECT * FROM usuarios;
SELECT * FROM produtos;
SELECT * FROM categorias;
SELECT * FROM pedidos;

-- Consultar movimentações trazendo o nome do produto
SELECT m.id, p.nome AS produto, m.tipo, m.quantidade, m.criado_em 
FROM movimentacoes m
LEFT JOIN produtos p ON p.id = m.produto_id
ORDER BY m.criado_em DESC;