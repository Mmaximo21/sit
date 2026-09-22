# Ajuste do PDF das escalas

## O que será feito

- Reorganizar o PDF em paisagem para sempre gerar uma única página A4, ajustando automaticamente altura das linhas e tamanhos de texto conforme a quantidade de colaboradores.
- Manter os grupos na ordem SD1, SD2, SD3, SD4 e colocar Diaristas por último, logo abaixo do SD4.
- Aumentar o logo da Prefeitura de Angra dos Reis sem deformá-lo, preservando a proporção original.
- Criar o registro de afastamento médico nas quatro escalas, com colaborador, início, retorno e observação opcional.
- Marcar no calendário os dias de afastamento médico e incluir, no rodapé do PDF, listas nominais de quem está de férias e de quem está afastado no mês.
- Acrescentar duas linhas de assinatura no final da página.

## Detalhes técnicos

- Criar uma tabela protegida para afastamentos médicos, seguindo as mesmas permissões das escalas.
- Compartilhar a consulta e os controles de afastamento no quadro usado pelas quatro escalas.
- Reservar uma faixa fixa no rodapé para legendas e assinaturas; o espaço restante determinará dinamicamente a altura das linhas da tabela.
- Quando houver mais colaboradores do que o limite legível de uma A4, reduzir tipografia e espaçamento até o mínimo seguro, sem criar uma segunda página.
- Validar o PDF renderizando-o como imagem e conferir cortes, proporções dos logos, ordem dos grupos, rodapé e assinaturas.
