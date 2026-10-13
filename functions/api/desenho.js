// functions/api/desenho.js
// Pages Function: POST /api/desenho
//
// Contrato:
//   Corpo:      JSON {"numero": <inteiro 1..100>}
//   Cabecalho:  Authorization: Bearer <id_token do Google>
//   200 -> SVG (image/svg+xml) assinado com o e-mail do token
//   400 -> corpo ausente, JSON invalido, numero ausente, nao inteiro ou fora de 1..100
//   401 -> token ausente, invalido, expirado, aud diferente do Client ID ou e-mail nao verificado
//   405 -> qualquer metodo diferente de POST
// Ordem das verificacoes: metodo (405), corpo (400), token (401).

import { gerarDesenho, numeroValido } from "../../lib/desenho.js";

const TOKENINFO = "https://oauth2.googleapis.com/tokeninfo?id_token=";

function erro(status, mensagem, extras = {}) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extras,
    },
  });
}

// 1) Corpo: devolve { numero } ou { falha: "mensagem" }
async function lerNumero(request) {
  let texto;
  try {
    texto = await request.text();
  } catch {
    return { falha: "Corpo da requisicao ausente." };
  }
  if (!texto || texto.trim() === "") {
    return { falha: "Corpo da requisicao ausente." };
  }

  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    return { falha: "JSON invalido." };
  }

  if (dados === null || typeof dados !== "object" || Array.isArray(dados)) {
    return { falha: "O corpo deve ser um objeto JSON no formato {\"numero\": 42}." };
  }
  if (!("numero" in dados)) {
    return { falha: "Campo numero ausente." };
  }
  // numeroValido usa Number.isInteger: rejeita strings ("42"), decimais e fora de 1..100.
  if (!numeroValido(dados.numero)) {
    return { falha: "O numero deve ser um inteiro entre 1 e 100." };
  }
  return { numero: dados.numero };
}

// 2) Token: devolve { email } ou { falha: "mensagem" }
async function verificarToken(request, clientId) {
  const cabecalho = request.headers.get("Authorization") || "";
  const partes = cabecalho.match(/^Bearer\s+(\S+)$/i);
  if (!partes) {
    return { falha: "Token ausente. Entre com a sua conta Google." };
  }

  let resposta;
  try {
    resposta = await fetch(TOKENINFO + encodeURIComponent(partes[1]));
  } catch {
    return { falha: "Nao foi possivel verificar o token." };
  }
  // tokeninfo responde 400 para token invalido ou expirado.
  if (resposta.status !== 200) {
    return { falha: "Token invalido ou expirado. Entre novamente." };
  }

  let info;
  try {
    info = await resposta.json();
  } catch {
    return { falha: "Resposta invalida do verificador de token." };
  }

  if (info.aud !== clientId) {
    return { falha: "Token emitido para outro Client ID." };
  }
  if (String(info.email_verified) !== "true") {
    return { falha: "E-mail da conta Google nao verificado." };
  }
  if (typeof info.email !== "string" || info.email === "") {
    return { falha: "Token sem e-mail." };
  }
  return { email: info.email };
}

export async function onRequest(context) {
  const { request, env } = context;

  // Verificacao 1: metodo
  if (request.method !== "POST") {
    return erro(405, "Metodo nao permitido. Use POST.", { Allow: "POST" });
  }

  // Verificacao 2: corpo
  const corpo = await lerNumero(request);
  if (corpo.falha) {
    return erro(400, corpo.falha);
  }

  // Verificacao 3: token
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return erro(500, "GOOGLE_CLIENT_ID nao configurado no servidor.");
  }
  const identidade = await verificarToken(request, clientId);
  if (identidade.falha) {
    return erro(401, identidade.falha, { "WWW-Authenticate": "Bearer" });
  }

  // Tudo certo: o e-mail vem do token, nunca do formulario.
  const svg = gerarDesenho(corpo.numero, identidade.email);
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}
