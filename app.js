const form = document.querySelector("#calculatorForm");
const modeButtons = [...document.querySelectorAll(".mode-button")];
const chart = document.querySelector("#rateChart");
const ctx = chart.getContext("2d");
const copyButton = document.querySelector("#copyResult");

const fields = {
  startDate: document.querySelector("#startDate"),
  endDate: document.querySelector("#endDate"),
  startRate: document.querySelector("#startRate"),
  endRate: document.querySelector("#endRate"),
  baseUsd: document.querySelector("#baseUsd"),
  margin: document.querySelector("#margin"),
  horizonDays: document.querySelector("#horizonDays"),
  cushion: document.querySelector("#cushion"),
};

const output = {
  suggestedRate: document.querySelector("#suggestedRate"),
  suggestedCaption: document.querySelector("#suggestedCaption"),
  historicalChange: document.querySelector("#historicalChange"),
  dailyChange: document.querySelector("#dailyChange"),
  projectedEndRate: document.querySelector("#projectedEndRate"),
  extraPercent: document.querySelector("#extraPercent"),
  suggestedPrice: document.querySelector("#suggestedPrice"),
  currentPrice: document.querySelector("#currentPrice"),
  protectionAmount: document.querySelector("#protectionAmount"),
  saleUsd: document.querySelector("#saleUsd"),
  plainExplanation: document.querySelector("#plainExplanation"),
};

let selectedMode = "average";
let lastResultText = "";

const formatterVES = new Intl.NumberFormat("es-VE", {
  style: "currency",
  currency: "VES",
  maximumFractionDigits: 2,
});

const formatterUSD = new Intl.NumberFormat("es-VE", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const formatterRate = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatterPercent = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function numberFrom(input) {
  return Number(String(input.value).replace(",", "."));
}

function daysBetween(start, end) {
  const startTime = new Date(`${start}T00:00:00`).getTime();
  const endTime = new Date(`${end}T00:00:00`).getTime();
  const diff = Math.round((endTime - startTime) / 86_400_000);
  return Number.isFinite(diff) ? Math.max(diff, 1) : 1;
}

function saveState() {
  const payload = Object.fromEntries(
    Object.entries(fields).map(([key, input]) => [key, input.value]),
  );
  payload.mode = selectedMode;
  localStorage.setItem("calculadora-promedial", JSON.stringify(payload));
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem("calculadora-promedial") || "{}");
    Object.entries(saved).forEach(([key, value]) => {
      if (fields[key]) fields[key].value = value;
    });
    if (saved.mode) selectedMode = saved.mode;
  } catch {
    localStorage.removeItem("calculadora-promedial");
  }
}

function buildProjection(endRate, dailyRate, horizonDays) {
  const values = [];
  for (let day = 0; day <= horizonDays; day += 1) {
    values.push(endRate * (1 + dailyRate) ** day);
  }
  return values;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function drawChart(values, suggestedRate) {
  const ratio = window.devicePixelRatio || 1;
  const rect = chart.getBoundingClientRect();
  chart.width = Math.round(rect.width * ratio);
  chart.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const pad = 20;
  const width = rect.width - pad * 2;
  const height = rect.height - pad * 2;
  const min = Math.min(...values, suggestedRate);
  const max = Math.max(...values, suggestedRate);
  const spread = Math.max(max - min, 1);

  ctx.strokeStyle = "#d9dfeb";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = pad + (height / 3) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(pad + width, y);
    ctx.stroke();
  }

  const pointFor = (value, index) => ({
    x: pad + (width * index) / Math.max(values.length - 1, 1),
    y: pad + height - ((value - min) / spread) * height,
  });

  ctx.beginPath();
  values.forEach((value, index) => {
    const point = pointFor(value, index);
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = "#168f8b";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.stroke();

  const suggestedY = pad + height - ((suggestedRate - min) / spread) * height;
  ctx.setLineDash([6, 7]);
  ctx.strokeStyle = "#d1495b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, suggestedY);
  ctx.lineTo(pad + width, suggestedY);
  ctx.stroke();
  ctx.setLineDash([]);

  const lastPoint = pointFor(values.at(-1), values.length - 1);
  ctx.fillStyle = "#14213d";
  ctx.beginPath();
  ctx.arc(lastPoint.x, lastPoint.y, 5, 0, Math.PI * 2);
  ctx.fill();
}

function updateModeButtons() {
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === selectedMode);
  });
}

function showInvalidState(message) {
  output.suggestedRate.textContent = "--";
  output.suggestedCaption.textContent = message;
  output.historicalChange.textContent = "--";
  output.dailyChange.textContent = "--";
  output.projectedEndRate.textContent = "--";
  output.extraPercent.textContent = "--";
  output.suggestedPrice.textContent = "--";
  output.currentPrice.textContent = "--";
  output.protectionAmount.textContent = "--";
  output.saleUsd.textContent = "--";
  output.plainExplanation.textContent = message;
  drawChart([1, 1], 1);
}

function calculate() {
  const startRate = numberFrom(fields.startRate);
  const endRate = numberFrom(fields.endRate);
  const baseUsd = numberFrom(fields.baseUsd);
  const margin = numberFrom(fields.margin) / 100;
  const horizonDays = Math.max(1, Math.round(numberFrom(fields.horizonDays)));
  const cushion = numberFrom(fields.cushion) / 100;
  const elapsedDays = daysBetween(fields.startDate.value, fields.endDate.value);

  if (
    !Number.isFinite(startRate) ||
    !Number.isFinite(endRate) ||
    !Number.isFinite(baseUsd) ||
    startRate <= 0 ||
    endRate <= 0 ||
    baseUsd < 0
  ) {
    showInvalidState("Revisa las tasas y el valor base. Deben ser números mayores que cero.");
    return;
  }

  const historicalChange = endRate / startRate - 1;
  const dailyRate = (endRate / startRate) ** (1 / elapsedDays) - 1;
  const projection = buildProjection(endRate, dailyRate, horizonDays);
  const projectedAverage = average(projection.slice(1));
  const projectedEnd = projection.at(-1);
  const baseSuggestedRate = selectedMode === "average" ? projectedAverage : projectedEnd;
  const suggestedRate = baseSuggestedRate * (1 + Math.max(cushion, 0));
  const saleUsd = baseUsd * (1 + Math.max(margin, 0));
  const currentPrice = saleUsd * endRate;
  const suggestedPrice = saleUsd * suggestedRate;
  const extraPercent = suggestedRate / endRate - 1;
  const protectionAmount = Math.max(suggestedPrice - currentPrice, 0);
  const modeLabel = selectedMode === "average" ? "promedio proyectado del mes" : "cierre proyectado del mes";

  output.suggestedRate.textContent = formatterRate.format(suggestedRate);
  output.suggestedCaption.textContent = `Basado en ${elapsedDays} días de movimiento y ${horizonDays} días sin cambiar precio.`;
  output.historicalChange.textContent = `${formatterPercent.format(historicalChange * 100)}%`;
  output.dailyChange.textContent = `${formatterPercent.format(dailyRate * 100)}%`;
  output.projectedEndRate.textContent = formatterRate.format(projectedEnd);
  output.extraPercent.textContent = `${formatterPercent.format(extraPercent * 100)}%`;
  output.suggestedPrice.textContent = formatterVES.format(suggestedPrice);
  output.currentPrice.textContent = formatterVES.format(currentPrice);
  output.protectionAmount.textContent = formatterVES.format(protectionAmount);
  output.saleUsd.textContent = formatterUSD.format(saleUsd);
  output.plainExplanation.textContent =
    `La tasa pasó de ${formatterRate.format(startRate)} a ${formatterRate.format(endRate)}, ` +
    `una variación de ${formatterPercent.format(historicalChange * 100)}%. ` +
    `Para vender durante ${horizonDays} días, el ${modeLabel} sugiere agregar ` +
    `${formatterPercent.format(extraPercent * 100)}% sobre la tasa actual.`;
  lastResultText =
    `Tasa sugerida: ${formatterRate.format(suggestedRate)} VES/USD\n` +
    `Precio sugerido: ${formatterVES.format(suggestedPrice)}\n` +
    `Ajuste sobre tasa actual: ${formatterPercent.format(extraPercent * 100)}%`;

  drawChart(projection, suggestedRate);
  saveState();
}

async function copyResult() {
  if (!lastResultText) return;
  try {
    await navigator.clipboard.writeText(lastResultText);
    copyButton.textContent = "Copiado";
  } catch {
    window.prompt("Copia el resultado", lastResultText);
  }
  window.setTimeout(() => {
    copyButton.textContent = "Copiar resultado";
  }, 1600);
}

restoreState();
updateModeButtons();
calculate();

form.addEventListener("input", calculate);
window.addEventListener("resize", calculate);

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedMode = button.dataset.mode;
    updateModeButtons();
    calculate();
  });
});

copyButton.addEventListener("click", copyResult);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
