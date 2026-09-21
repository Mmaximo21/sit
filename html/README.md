# Versão estática — Sistema Interno (I.L.P.I Luiza Olindina da Silva Alves)

Esta pasta contém a tela inicial do site em **HTML, CSS e JavaScript puro**.
Funciona sozinha, sem React, Vite ou Node.js na hospedagem.

## Arquivos

- `index.html` — estrutura, textos e metadados (SEO/Open Graph)
- `styles.css` — design system, responsividade e animações
- `script.js` — metas de segurança, mostrar/ocultar senha, toast e login
- `assets/` — símbolo da I.L.P.I, Prefeitura de Angra dos Reis e IGEDES
- `favicon.png`, `robots.txt`

## Como publicar

Copie o conteúdo da pasta `html/` para qualquer hospedagem estática
(Apache, Nginx, cPanel, GitHub Pages, Netlify, etc.). Nenhum build é necessário.

Para testar localmente, basta abrir `index.html` no navegador.

## Login

As áreas internas (avaliações, exames, cardápios, relatórios de plantão)
dependem de autenticação e banco de dados, portanto continuam na versão React.
Ao enviar o formulário, a versão estática encaminha o profissional para o
sistema autenticado. Ajuste a URL na constante `APP_URL`, no início de
`script.js`, caso o endereço do sistema mude.

A versão React original permanece intacta em `src/` para edição no Lovable.
