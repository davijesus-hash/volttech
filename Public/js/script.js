const listaProdutos = document.getElementById("lista-produtos");
const mensagemProdutos = document.getElementById("mensagem-produtos");

document.getElementById("ano-atual").textContent =
    new Date().getFullYear();

async function carregarProdutos() {
    mensagemProdutos.textContent = "Carregando produtos...";
    listaProdutos.replaceChildren();

    try {
        const resposta = await fetch("/api/produtos");

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar os produtos.");
        }

        const produtos = await resposta.json();

        if (!Array.isArray(produtos) || produtos.length === 0) {
            mensagemProdutos.textContent =
                "Nenhum produto disponível no momento.";
            return;
        }

        mensagemProdutos.textContent = "";

        produtos.forEach((produto) => {
            const card = document.createElement("article");
            card.className = "product-card";

            const imagem = document.createElement("div");
            imagem.className = "product-image";

            const imagemTexto = document.createElement("span");
            imagemTexto.textContent = "Produto recondicionado";
            imagem.appendChild(imagemTexto);

            const nome = document.createElement("h3");
            nome.textContent = produto.nome;

            const marca = document.createElement("p");
            marca.textContent = produto.marca || "Marca não informada";

            const condicao = document.createElement("p");
            condicao.textContent = "Condição: " + produto.condicao;

            const preco = document.createElement("p");
            preco.className = "product-price";
            preco.textContent = Number(produto.preco).toLocaleString(
                "pt-BR",
                {
                    style: "currency",
                    currency: "BRL"
                }
            );

            const estoque = document.createElement("p");
            estoque.textContent = produto.quantidade > 0
                ? "Disponível em estoque"
                : "Indisponível";

            card.append(
                imagem,
                nome,
                marca,
                condicao,
                preco,
                estoque
            );

            listaProdutos.appendChild(card);
        });
    } catch (erro) {
        console.error(erro);

        mensagemProdutos.textContent =
            "Não foi possível carregar os produtos. Tente novamente.";

        const botao = document.createElement("button");
        botao.type = "button";
        botao.textContent = "Tentar novamente";
        botao.addEventListener("click", carregarProdutos);

        mensagemProdutos.appendChild(document.createTextNode(" "));
        mensagemProdutos.appendChild(botao);
    }
}

carregarProdutos();
