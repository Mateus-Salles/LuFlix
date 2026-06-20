# LuFlix SPA

Single Page App minimal para administrar filmes e séries da API LuFlix.

Instalação: coloque a pasta `spa/` no mesmo nível do servidor ou sirva os arquivos estáticos do endpoint.

Abrir `spa/index.html` no navegador e ajustar `API_BASE` em `app.js` caso necessário.

Funcionalidades:

- Listagem de Filmes
- Listagem de Séries
- Formulário para adicionar Filmes (envio multipart/form-data com `media` obrigatório)
- Formulário para adicionar Episódio (cria série/temporada se necessário)
- Visualização detalhada com opções de editar/excluir (dependendo do backend)

Nota: o backend deve expor as rotas conforme a API LuFlix (prefixo `/api/v1`).
