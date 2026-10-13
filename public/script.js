// script.js
// A pagina so coleta o numero e o id_token do Google.
// O desenho e gerado no servidor (POST /api/desenho), que obtem o e-mail
// da assinatura a partir do token verificado.

const formulario = document.getElementById("formulario");
const campoNumero = document.getElementById("numero");
const area = document.getElementById("desenho");
const mensagem = document.getElementById("mensagem");
const botaoBaixar = document.getElementById("baixar");
const usuario = document.getElementById("usuario");
const botaoSair = document.getElementById("sair");

let idToken = "";
let svgAtual = "";

// Le o payload do JWT apenas para mostrar quem esta logado.
// Nao e verificacao: quem confia no token e o servidor.
function lerPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function mostrarSessao() {
  const logado = idToken !== "";
  usuario.hidden = !logado;
  botaoSair.hidden = !logado;
  usuario.textContent = logado ? `Conectado como ${lerPayload(idToken).email || "conta Google"}` : "";
}

// Chamado pelo Google Identity Services apos o login (data-callback no index.html).
window.aoEntrarComGoogle = (resposta) => {
  idToken = resposta.credential || "";
  mensagem.textContent = "";
  mostrarSessao();
};

botaoSair.addEventListener("click", () => {
  idToken = "";
  if (window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect();
  }
  limparDesenho();
  mostrarSessao();
});

function limparDesenho() {
  svgAtual = "";
  area.innerHTML = "";
  botaoBaixar.hidden = true;
}

async function lerErro(resposta) {
  try {
    const dados = await resposta.json();
    return dados.erro || "";
  } catch {
    return "";
  }
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagem.textContent = "";
  limparDesenho();

  // Sem validacao local: o servidor decide e a pagina mostra a resposta.
  const numero = campoNumero.value.trim() === "" ? null : Number(campoNumero.value);

  const cabecalhos = { "Content-Type": "application/json" };
  if (idToken) {
    cabecalhos.Authorization = `Bearer ${idToken}`;
  }

  let resposta;
  try {
    resposta = await fetch("/api/desenho", {
      method: "POST",
      headers: cabecalhos,
      body: JSON.stringify({ numero }),
    });
  } catch {
    mensagem.textContent = "Falha de rede ao contatar o servidor.";
    return;
  }

  if (resposta.status === 200) {
    svgAtual = await resposta.text();
    area.innerHTML = svgAtual;
    botaoBaixar.hidden = false;
    return;
  }

  const detalhe = await lerErro(resposta);

  if (resposta.status === 400) {
    mensagem.textContent = `Erro 400: número inválido. ${detalhe || "Digite um inteiro entre 1 e 100."}`;
  } else if (resposta.status === 401) {
    mensagem.textContent = `Erro 401: não autenticado. ${detalhe || "Entre com a sua conta Google."}`;
    idToken = "";
    mostrarSessao();
  } else {
    mensagem.textContent = `Erro ${resposta.status}. ${detalhe}`;
  }
});

botaoBaixar.addEventListener("click", () => {
  const arquivo = new Blob([svgAtual], { type: "image/svg+xml" });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = "exemplo.svg";
  link.click();
  URL.revokeObjectURL(url);
});
