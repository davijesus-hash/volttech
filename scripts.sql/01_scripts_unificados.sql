-- =============================================================================
-- VOLTTECH - SCRIPT SQL COMPLETO (ESTRUTURA + SEEDS)
-- =============================================================================

-- 1. LIMPEZA PREVENTIVA (Opcional: Limpa dados pré-existentes e reinicia IDs)
TRUNCATE TABLE movimentacoes, pedidos, produtos, usuarios, categorias RESTART IDENTITY CASCADE;

-- =============================================================================
-- CRIAÇÃO DAS TABELAS
-- =============================================================================

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    imagem_url TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Usuários (Com suporte a 'situacao' e 'permissao')
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    permissao VARCHAR(50) DEFAULT 'admin',
    situacao VARCHAR(20) DEFAULT 'Ativo',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Produtos (Com 'qtd_minima' para alertas de estoque)
CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    marca VARCHAR(100) DEFAULT 'VoltTech',
    preco DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    condicao VARCHAR(50) DEFAULT 'Excelente',
    quantidade INT DEFAULT 0,
    qtd_minima INT DEFAULT 5,
    imagem_url TEXT DEFAULT 'https://via.placeholder.com/300',
    categoria_id INT REFERENCES categorias(id) ON DELETE SET NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
    valor_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Pendente',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Movimentações de Estoque
CREATE TABLE IF NOT EXISTS movimentacoes (
    id SERIAL PRIMARY KEY,
    produto_id INT REFERENCES produtos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL, -- 'entrada' ou 'saida'
    quantidade INT NOT NULL,
    descricao VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- GARANTIA DE COLUNAS (Caso as tabelas já existissem previamente)
-- =============================================================================
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS situacao VARCHAR(20) DEFAULT 'Ativo';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permissao VARCHAR(50) DEFAULT 'admin';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS qtd_minima INT DEFAULT 5;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS marca VARCHAR(100) DEFAULT 'VoltTech';

-- =============================================================================
-- INSERÇÃO DE DADOS INICIAIS (SEEDS)
-- =============================================================================

-- 1. Categorias Padrão
INSERT INTO categorias (nome, descricao, imagem_url) VALUES 
('Celulares', 'Smartphones e dispositivos móveis recondicionados', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300'),
('Notebooks', 'Laptops e ultrabooks para trabalho e estudo', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300'),
('Acessórios', 'Fones, carregadores e periféricos testados', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300');

-- 2. Administrador Padrão (Email: admin@volttech.com.br | Senha: admin)
INSERT INTO usuarios (nome, email, senha, permissao, situacao) VALUES 
('Administrador', 'admin@volttech.com.br', 'admin', 'admin', 'Ativo')
ON CONFLICT (email) 
DO UPDATE SET senha = 'admin', situacao = 'Ativo', permissao = 'admin';

-- 3. Produtos Iniciais de Teste
INSERT INTO produtos (nome, marca, preco, condicao, quantidade, qtd_minima, categoria_id, imagem_url) VALUES 
('Samsung Galaxy A34 Dual Chip 5G 128GB', 'Samsung', 949.00, 'Excelente', 15, 5, 1, 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500'),
('iPhone 13 Pro Max 128GB', 'Apple', 3899.90, 'Muito bom', 8, 5, 1, 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=500'),
('MacBook Air M1 8GB 256GB', 'Apple', 4299.00, 'Excelente', 5, 3, 2, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500');

-- 4. Pedidos Iniciais para Métricas
INSERT INTO pedidos (usuario_id, valor_total, status) VALUES 
(1, 949.00, 'Concluído'),
(1, 3899.90, 'Pendente');

-- 5. Historico de Movimentações
INSERT INTO movimentacoes (produto_id, tipo, quantidade, descricao) VALUES 
(1, 'entrada', 15, 'Lote inicial de estoque'),
(2, 'entrada', 8, 'Lote inicial de estoque'),
(3, 'entrada', 5, 'Lote inicial de estoque');