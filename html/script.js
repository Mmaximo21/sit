/* Sistema Interno — versão estática (sem React / Vite / Node).
   Recria a tela inicial: metas de segurança, animações, mostrar/ocultar senha
   e encaminhamento do login para o sistema autenticado. */

// URL do sistema autenticado (versão React hospedada no Lovable).
var APP_URL = "https://si-ilpi.lovable.app/";

var SAFETY_GOALS = [
  "Identificar corretamente o paciente.",
  "Melhorar a comunicação entre profissionais de saúde.",
  "Melhorar a segurança na prescrição, no uso e na administração de medicamentos.",
  "Higienizar as mãos para evitar infecções.",
  "Reduzir o risco de quedas e úlceras por pressão.",
];

// Metas Internacionais de Segurança do Paciente
var goalsList = document.getElementById("safety-goals");
SAFETY_GOALS.forEach(function (goal, index) {
  var li = document.createElement("li");
  li.className = "rise";
  li.style.animationDelay = 340 + index * 90 + "ms";

  var num = document.createElement("span");
  num.className = "num";
  num.textContent = String(index + 1);

  var text = document.createElement("span");
  text.textContent = goal;

  li.appendChild(num);
  li.appendChild(text);
  goalsList.appendChild(li);
});

// Toast simples
var toastEl = document.getElementById("toast");
var toastTimer;
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toastEl.classList.remove("show");
  }, 4200);
}

// Mostrar / ocultar senha
var passwordInput = document.getElementById("password");
var toggleBtn = document.getElementById("toggle-password");
var eyeIcon = document.getElementById("eye-icon");

var EYE =
  '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />';
var EYE_OFF =
  '<path d="M3 3l18 18" /><path d="M10.6 5.2A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-2.5 3.4" /><path d="M6.5 7.6A18 18 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 3.6-.7" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />';

toggleBtn.addEventListener("click", function () {
  var showing = passwordInput.type === "text";
  passwordInput.type = showing ? "password" : "text";
  eyeIcon.innerHTML = showing ? EYE : EYE_OFF;
  toggleBtn.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
});

// Envio do formulário: encaminha para o sistema autenticado
var form = document.getElementById("login-form");
var submitBtn = document.getElementById("submit-btn");
var submitLabel = submitBtn.querySelector(".submit-label");

form.addEventListener("submit", function (event) {
  event.preventDefault();

  var username = document.getElementById("username").value.trim();
  var password = passwordInput.value;

  if (!username || !password) {
    toast("Informe usuário e senha.");
    return;
  }

  submitBtn.disabled = true;
  submitLabel.textContent = "Entrando…";
  toast("Redirecionando para o sistema seguro…");

  setTimeout(function () {
    window.location.href = APP_URL;
  }, 900);
});
