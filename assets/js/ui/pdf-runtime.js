const PDFMAKE_SRC = "/assets/vendor/pdfmake/pdfmake.min.js";
const PDFMAKE_FONTS_SRC = "/assets/vendor/pdfmake/vfs_fonts.js";
let pdfMakePromise = null;

const carregarScript = (src) =>
  new Promise((resolve, reject) => {
    const existente = document.querySelector(`script[data-relatorio-src="${src}"]`);
    if (existente?.dataset.loaded === "true") {
      resolve();
      return;
    }
    const script = existente || document.createElement("script");
    script.dataset.relatorioSrc = src;
    script.src = src;
    script.async = false;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => reject(new Error(`Não foi possível carregar ${src}.`)),
      { once: true },
    );
    if (!existente) document.head.appendChild(script);
  });

export const carregarPdfMake = async () => {
  if (window.pdfMake?.createPdf) return window.pdfMake;
  if (!pdfMakePromise) {
    pdfMakePromise = (async () => {
      await carregarScript(PDFMAKE_SRC);
      await carregarScript(PDFMAKE_FONTS_SRC);
      if (!window.pdfMake?.createPdf) {
        throw new Error("O gerador de PDF não ficou disponível no navegador.");
      }
      return window.pdfMake;
    })().catch((error) => {
      pdfMakePromise = null;
      throw error;
    });
  }
  return pdfMakePromise;
};

export const baixarBlob = (blob, nomeArquivo) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
