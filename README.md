# Desenho Assinado

Página que recebe um número inteiro entre 1 e 100 e devolve uma figura em SVG, assinada com o e-mail da conta Google usada no login.

A figura é a tabuada modular no círculo: 240 pontos igualmente espaçados numa circunferência, com cada ponto `i` ligado ao ponto `(k * i) mod 240`, em que `k = número + 1`. O número 1 produz uma cardioide, o 2 uma nefroide, e cada valor gera uma figura diferente.

## Arquitetura

O desenho é gerado no servidor por uma Pages Function. A página envia apenas o número e o `id_token` do Google; o servidor valida o token no endpoint `tokeninfo` e usa o campo `email` da resposta como assinatura. O campo de e-mail não existe mais no formulário.

```
public/
  index.html             formulário com o número e o botão Sign in with Google
  style.css              aparência da página
  script.js              envia número e token com fetch e exibe a resposta
lib/
  desenho.js             gerarDesenho (fora de public/, nunca servido ao navegador)
functions/
  api/desenho.js         POST /api/desenho: valida método, corpo e token
evidencias/
  exemplo.svg            desenho gerado pelo site publicado
```

## Contrato da API

| Item | Exigência |
|---|---|
| Rota | `POST /api/desenho` |
| Corpo | `{"numero": 42}` |
| Cabeçalho | `Authorization: Bearer <id_token>` |
| 200 | SVG, `Content-Type: image/svg+xml`, assinado com o e-mail do token |
| 400 | Corpo ausente, JSON inválido, `numero` ausente, não inteiro ou fora de 1 a 100 |
| 401 | Token ausente, inválido, expirado, `aud` diferente do Client ID ou e-mail não verificado |
| 405 | Qualquer método diferente de `POST` |
| Ordem | método (405), corpo (400), token (401) |

## Publicação no Cloudflare Pages

Framework preset: `None`. Build command: vazio. Build output directory: `public`.

Variável de ambiente: `GOOGLE_CLIENT_ID` com o Client ID do OAuth Client (Web application).

## Identificação (preencha após o fork)

Nome: Vinicius Kichel Derganho
RA: 2026107869
URL: https://desenho-assinado-vinicius.pages.dev
