-- ==========================================
-- DADOS INICIAIS / SEEDS (VOLTTECH)
-- ==========================================

-- Limpa dados pré-existentes e reinicia sequências de ID
TRUNCATE TABLE movimentacoes, pedidos, produtos, usuarios, categorias RESTART IDENTITY CASCADE;

-- 1. Categorias
INSERT INTO categorias (nome, descricao, imagem_url) VALUES 
('Celulares', 'Smartphones e dispositivos móveis recondicionados', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300'),
('Notebooks', 'Laptops e ultrabooks para trabalho e estudo', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300'),
('Acessórios', 'Fones, carregadores e periféricos testados', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300');

-- 2. Administrador Inicial (Email: admin@volttech.com.br | Senha: admin)
INSERT INTO usuarios (nome, email, senha, permissao) VALUES 
('Administrador', 'admin@volttech.com.br', '$2a$10$wE8a8PZ6XhFjW9MhA6d7/.x53uM0TqJ98i5yO1gqU1T48m.E/pDOG', 'admin');

-- 3. Produtos
INSERT INTO produtos (nome, marca, preco, condicao, quantidade, categoria_id, imagem_url) VALUES 
('Samsung Galaxy A34 Dual Chip 5G 128GB', 'Samsung', 949.00, 'Excelente', 15, 1, 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500'),
('iPhone 13 Pro Max 128GB', 'Apple', 3899.90, 'Muito bom', 8, 1, 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=500'),
('MacBook Air M1 8GB 256GB', 'Apple', 4299.00, 'Excelente', 5, 2, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500');

-- 4. Pedidos de Teste
INSERT INTO pedidos (usuario_id, valor_total, status) VALUES 
(1, 949.00, 'Concluído'),
(1, 3899.90, 'Pendente');

-- 5. Movimentações de Estoque
INSERT INTO movimentacoes (produto_id, tipo, quantidade, descricao) VALUES 
(1, 'entrada', 15, 'Lote inicial de estoque'),
(2, 'entrada', 8, 'Lote inicial de estoque'),
(3, 'entrada', 5, 'Lote inicial de estoque');