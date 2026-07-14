// Toast de feedback efêmero (canto da tela). Esqueleto único compartilhado entre
// telas — CSS em `components.css` (`.toast-root`, `.toast`, `.toast--success`,
// `.toast--leaving`). Antes vivia local em `secretaria-ciencia-page.js`.

const TOAST_ROOT_ID = "nad-toast-root";

const ensureToastRoot = () => {
  let root = document.getElementById(TOAST_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = TOAST_ROOT_ID;
    root.className = "toast-root";
    document.body.appendChild(root);
  }
  return root;
};

export const showToast = (mensagem) => {
  const root = ensureToastRoot();
  const toast = document.createElement("div");
  toast.className = "toast toast--success";
  toast.textContent = mensagem;
  root.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast--leaving");
    setTimeout(() => toast.remove(), 350);
  }, 3500);
};
