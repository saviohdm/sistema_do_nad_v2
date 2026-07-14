const MS_POR_DIA = 24 * 60 * 60 * 1000;

const doisDigitos = (valor) => String(valor).padStart(2, "0");

const parseDataLocal = (valor) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor || ""));
  if (!match) return null;

  const [, anoTexto, mesTexto, diaTexto] = match;
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);
  const data = new Date(ano, mes - 1, dia);

  if (
    Number.isNaN(data.getTime()) ||
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return null;
  }

  return data;
};

export const formatarDataLocalParaInput = (data) =>
  `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;

export const obterDataLocalHoje = (agora = new Date()) => formatarDataLocalParaInput(agora);

export const somarDiasCorridos = (dataInicial, quantidadeDias) => {
  const data = parseDataLocal(dataInicial);
  const dias = Number(quantidadeDias);
  if (!data || !Number.isInteger(dias) || dias < 0) return "";

  data.setDate(data.getDate() + dias);
  return Number.isNaN(data.getTime()) || data.getFullYear() > 9999
    ? ""
    : formatarDataLocalParaInput(data);
};

export const calcularDiasCorridos = (dataInicial, dataFinal) => {
  const inicio = parseDataLocal(dataInicial);
  const fim = parseDataLocal(dataFinal);
  if (!inicio || !fim) return null;

  // Date.UTC é usado apenas como escala de dias. As partes da data foram lidas
  // no calendário local, evitando que horário de verão/fuso altere a contagem.
  const inicioUtc = Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const fimUtc = Date.UTC(fim.getFullYear(), fim.getMonth(), fim.getDate());
  return Math.round((fimUtc - inicioUtc) / MS_POR_DIA);
};

export const renderPrazoDiligenciaControl = ({ idPrefix }) => {
  const hoje = obterDataLocalHoje();
  const dataId = `${idPrefix}-data-final`;
  const diasId = `${idPrefix}-quantidade-dias`;
  const ajudaId = `${idPrefix}-prazo-ajuda`;
  const erroId = `${idPrefix}-prazo-erro`;

  return `
    <fieldset class="prazo-diligencia" data-prazo-diligencia data-prazo-inicio="${hoje}">
      <legend>Prazo para comprovação</legend>
      <div class="prazo-diligencia__campos">
        <div class="field">
          <label for="${dataId}">Data final</label>
          <input id="${dataId}" name="prazo" type="date" min="${hoje}" max="9999-12-31" required
            data-prazo-data aria-describedby="${ajudaId} ${erroId}" />
        </div>
        <span class="prazo-diligencia__ou" aria-hidden="true">ou</span>
        <div class="field">
          <label for="${diasId}">Quantidade de dias corridos</label>
          <input id="${diasId}" name="prazoDias" type="number" min="0" step="1"
            inputmode="numeric" required data-prazo-dias
            aria-describedby="${ajudaId} ${erroId}" />
        </div>
      </div>
      <p class="prazo-diligencia__ajuda" id="${ajudaId}">
        Informe a data ou a quantidade de dias; o outro campo será calculado automaticamente.
      </p>
      <p class="prazo-diligencia__erro" id="${erroId}" role="alert" aria-live="polite" aria-atomic="true" hidden></p>
    </fieldset>
  `;
};

const bindControle = (controle) => {
  const dataInput = controle.querySelector("[data-prazo-data]");
  const diasInput = controle.querySelector("[data-prazo-dias]");
  const erro = controle.querySelector(".prazo-diligencia__erro");
  const inicio = controle.dataset.prazoInicio;
  if (!dataInput || !diasInput || !erro || !inicio) return;

  const limparErro = () => {
    dataInput.setCustomValidity("");
    diasInput.setCustomValidity("");
    erro.textContent = "";
    erro.hidden = true;
  };

  const mostrarErro = (mensagem, input) => {
    limparErro();
    input.setCustomValidity(mensagem);
    erro.textContent = mensagem;
    erro.hidden = false;
  };

  const sincronizarPelosDias = () => {
    limparErro();
    const valor = diasInput.value.trim();
    if (!valor) {
      dataInput.value = "";
      return;
    }
    if (!/^\d+$/.test(valor) || !Number.isSafeInteger(Number(valor))) {
      mostrarErro("Informe uma quantidade inteira de dias, igual ou superior a zero.", diasInput);
      return;
    }

    const dataFinal = somarDiasCorridos(inicio, Number(valor));
    if (!dataFinal) {
      mostrarErro("A quantidade informada ultrapassa o limite suportado pelo calendário.", diasInput);
      return;
    }
    dataInput.value = dataFinal;
  };

  const sincronizarPelaData = () => {
    limparErro();
    const valor = dataInput.value;
    if (!valor) {
      diasInput.value = "";
      return;
    }

    const dias = calcularDiasCorridos(inicio, valor);
    if (dias == null) {
      mostrarErro("Informe uma data final válida.", dataInput);
      return;
    }
    if (dias < 0) {
      mostrarErro("A data final não pode ser anterior à data atual.", dataInput);
      return;
    }
    diasInput.value = String(dias);
  };

  dataInput.addEventListener("input", sincronizarPelaData);
  diasInput.addEventListener("input", sincronizarPelosDias);

  dataInput.addEventListener("invalid", () => {
    if (dataInput.validity.valueMissing) {
      erro.textContent = "Informe a data final ou a quantidade de dias do prazo.";
      erro.hidden = false;
    } else if (dataInput.validity.rangeUnderflow) {
      erro.textContent = "A data final não pode ser anterior à data atual.";
      erro.hidden = false;
    }
  });

  diasInput.addEventListener("invalid", () => {
    if (diasInput.validity.valueMissing) {
      erro.textContent = "Informe a data final ou a quantidade de dias do prazo.";
    } else {
      erro.textContent = "Informe uma quantidade inteira de dias, igual ou superior a zero.";
    }
    erro.hidden = false;
  });
};

export const bindPrazoDiligenciaControls = (root = document) => {
  root.querySelectorAll("[data-prazo-diligencia]").forEach(bindControle);
};
