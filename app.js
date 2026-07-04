(function () {
  "use strict";

  function qs(selector) {
    return document.querySelector(selector);
  }

  var form = qs("#calculatorForm");
  var modeButtons = Array.prototype.slice.call(document.querySelectorAll(".mode-button"));
  var chart = qs("#rateChart");
  var ctx = chart ? chart.getContext("2d") : null;
  var copyButton = qs("#copyResult");

  var fields = {
    startDate: qs("#startDate"),
    endDate: qs("#endDate"),
    startRate: qs("#startRate"),
    endRate: qs("#endRate"),
    baseUsd: qs("#baseUsd"),
    margin: qs("#margin"),
    horizonDays: qs("#horizonDays"),
    cushion: qs("#cushion"),
  };

  var output = {
    suggestedRate: qs("#suggestedRate"),
    suggestedCaption: qs("#suggestedCaption"),
    historicalChange: qs("#historicalChange"),
    dailyChange: qs("#dailyChange"),
    projectedEndRate: qs("#projectedEndRate"),
    extraPercent: qs("#extraPercent"),
    suggestedPrice: qs("#suggestedPrice"),
    currentPrice: qs("#currentPrice"),
    protectionAmount: qs("#protectionAmount"),
    saleUsd: qs("#saleUsd"),
    plainExplanation: qs("#plainExplanation"),
  };

  var selectedMode = "average";
  var lastResultText = "";

  function safeNumberFormat(locale, options, fallback) {
    try {
      return new Intl.NumberFormat(locale, options);
    } catch (error) {
      return {
        format: fallback,
      };
    }
  }

  var formatterVES = safeNumberFormat(
    "es-VE",
    { style: "currency", currency: "VES", maximumFractionDigits: 2 },
    function (value) {
      return "Bs. " + fixed(value, 2);
    },
  );

  var formatterUSD = safeNumberFormat(
    "es-VE",
    { style: "currency", currency: "USD", maximumFractionDigits: 2 },
    function (value) {
      return "$" + fixed(value, 2);
    },
  );

  var formatterRate = safeNumberFormat(
    "es-VE",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    function (value) {
      return fixed(value, 2);
    },
  );

  var formatterPercent = safeNumberFormat(
    "es-VE",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    function (value) {
      return fixed(value, 2);
    },
  );

  function fixed(value, decimals) {
    var numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0.00";
    return numeric.toFixed(decimals);
  }

  function normalizeNumber(raw) {
    var value = String(raw || "").trim();
    value = value.replace(/\s/g, "");

    if (value.indexOf(",") >= 0 && value.indexOf(".") >= 0) {
      var lastComma = value.lastIndexOf(",");
      var lastDot = value.lastIndexOf(".");
      if (lastComma > lastDot) {
        value = value.replace(/\./g, "").replace(",", ".");
      } else {
        value = value.replace(/,/g, "");
      }
    } else {
      value = value.replace(",", ".");
    }

    value = value.replace(/[^0-9.-]/g, "");
    return Number(value);
  }

  function numberFrom(input) {
    return normalizeNumber(input && input.value);
  }

  function daysBetween(start, end) {
    var startTime = new Date(String(start || "") + "T00:00:00").getTime();
    var endTime = new Date(String(end || "") + "T00:00:00").getTime();
    var diff = Math.round((endTime - startTime) / 86400000);
    return Number.isFinite(diff) ? Math.max(diff, 1) : 1;
  }

  function saveState() {
    try {
      var payload = {};
      Object.keys(fields).forEach(function (key) {
        payload[key] = fields[key] ? fields[key].value : "";
      });
      payload.mode = selectedMode;
      localStorage.setItem("calculadora-promedial-v4", JSON.stringify(payload));
    } catch (error) {}
  }

  function restoreState() {
    try {
      var saved = JSON.parse(
        localStorage.getItem("calculadora-promedial-v4") ||
          localStorage.getItem("calculadora-promedial") ||
          "{}",
      );
      Object.keys(saved).forEach(function (key) {
        if (fields[key]) fields[key].value = saved[key];
      });
      if (saved.mode) selectedMode = saved.mode;
    } catch (error) {
      try {
        localStorage.removeItem("calculadora-promedial-v4");
      } catch (innerError) {}
    }
  }

  function buildProjection(endRate, dailyRate, horizonDays) {
    var values = [];
    for (var day = 0; day <= horizonDays; day += 1) {
      values.push(endRate * Math.pow(1 + dailyRate, day));
    }
    return values;
  }

  function average(values) {
    if (!values.length) return 0;
    return values.reduce(function (sum, value) {
      return sum + value;
    }, 0) / values.length;
  }

  function drawChart(values, suggestedRate) {
    if (!chart || !ctx) return;

    var ratio = window.devicePixelRatio || 1;
    var rect = chart.getBoundingClientRect();
    var rectWidth = rect.width || 320;
    var rectHeight = rect.height || 170;

    chart.width = Math.round(rectWidth * ratio);
    chart.height = Math.round(rectHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, rectWidth, rectHeight);

    var pad = 20;
    var width = rectWidth - pad * 2;
    var height = rectHeight - pad * 2;
    var min = Math.min.apply(null, values.concat([suggestedRate]));
    var max = Math.max.apply(null, values.concat([suggestedRate]));
    var spread = Math.max(max - min, 1);

    ctx.strokeStyle = "#d9dfeb";
    ctx.lineWidth = 1;
    for (var i = 0; i < 4; i += 1) {
      var y = pad + (height / 3) * i;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(pad + width, y);
      ctx.stroke();
    }

    function pointFor(value, index) {
      return {
        x: pad + (width * index) / Math.max(values.length - 1, 1),
        y: pad + height - ((value - min) / spread) * height,
      };
    }

    ctx.beginPath();
    values.forEach(function (value, index) {
      var point = pointFor(value, index);
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = "#168f8b";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();

    var suggestedY = pad + height - ((suggestedRate - min) / spread) * height;
    ctx.setLineDash([6, 7]);
    ctx.strokeStyle = "#d1495b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad, suggestedY);
    ctx.lineTo(pad + width, suggestedY);
    ctx.stroke();
    ctx.setLineDash([]);

    var lastValue = values[values.length - 1];
    var lastPoint = pointFor(lastValue, values.length - 1);
    ctx.fillStyle = "#14213d";
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function updateModeButtons() {
    modeButtons.forEach(function (button) {
      if (button.dataset.mode === selectedMode) button.classList.add("active");
      else button.classList.remove("active");
    });
  }

  function setText(node, text) {
    if (node) node.textContent = text;
  }

  function showInvalidState(message) {
    setText(output.suggestedRate, "--");
    setText(output.suggestedCaption, message);
    setText(output.historicalChange, "--");
    setText(output.dailyChange, "--");
    setText(output.projectedEndRate, "--");
    setText(output.extraPercent, "--");
    setText(output.suggestedPrice, "--");
    setText(output.currentPrice, "--");
    setText(output.protectionAmount, "--");
    setText(output.saleUsd, "--");
    setText(output.plainExplanation, message);
    drawChart([1, 1], 1);
  }

  function calculate() {
    var startRate = numberFrom(fields.startRate);
    var endRate = numberFrom(fields.endRate);
    var baseUsd = numberFrom(fields.baseUsd);
    var margin = numberFrom(fields.margin) / 100;
    var horizonDays = Math.max(1, Math.round(numberFrom(fields.horizonDays)) || 1);
    var cushion = numberFrom(fields.cushion) / 100;
    var elapsedDays = daysBetween(fields.startDate.value, fields.endDate.value);

    if (
      !Number.isFinite(startRate) ||
      !Number.isFinite(endRate) ||
      !Number.isFinite(baseUsd) ||
      startRate <= 0 ||
      endRate <= 0 ||
      baseUsd < 0
    ) {
      showInvalidState("Revisa las tasas y el valor base. Usa números mayores que cero. Puedes escribir punto o coma decimal.");
      return;
    }

    var historicalChange = endRate / startRate - 1;
    var dailyRate = Math.pow(endRate / startRate, 1 / elapsedDays) - 1;
    var projection = buildProjection(endRate, dailyRate, horizonDays);
    var projectedAverage = average(projection.slice(1));
    var projectedEnd = projection[projection.length - 1];
    var baseSuggestedRate = selectedMode === "average" ? projectedAverage : projectedEnd;
    var safeCushion = Number.isFinite(cushion) ? Math.max(cushion, 0) : 0;
    var safeMargin = Number.isFinite(margin) ? Math.max(margin, 0) : 0;
    var suggestedRate = baseSuggestedRate * (1 + safeCushion);
    var saleUsd = baseUsd * (1 + safeMargin);
    var currentPrice = saleUsd * endRate;
    var suggestedPrice = saleUsd * suggestedRate;
    var extraPercent = suggestedRate / endRate - 1;
    var protectionAmount = Math.max(suggestedPrice - currentPrice, 0);
    var modeLabel = selectedMode === "average" ? "promedio proyectado del mes" : "cierre proyectado del mes";

    setText(output.suggestedRate, formatterRate.format(suggestedRate));
    setText(output.suggestedCaption, "Basado en " + elapsedDays + " días de movimiento y " + horizonDays + " días sin cambiar precio.");
    setText(output.historicalChange, formatterPercent.format(historicalChange * 100) + "%");
    setText(output.dailyChange, formatterPercent.format(dailyRate * 100) + "%");
    setText(output.projectedEndRate, formatterRate.format(projectedEnd));
    setText(output.extraPercent, formatterPercent.format(extraPercent * 100) + "%");
    setText(output.suggestedPrice, formatterVES.format(suggestedPrice));
    setText(output.currentPrice, formatterVES.format(currentPrice));
    setText(output.protectionAmount, formatterVES.format(protectionAmount));
    setText(output.saleUsd, formatterUSD.format(saleUsd));
    setText(
      output.plainExplanation,
      "La tasa pasó de " +
        formatterRate.format(startRate) +
        " a " +
        formatterRate.format(endRate) +
        ", una variación de " +
        formatterPercent.format(historicalChange * 100) +
        "%. Para vender durante " +
        horizonDays +
        " días, el " +
        modeLabel +
        " sugiere agregar " +
        formatterPercent.format(extraPercent * 100) +
        "% sobre la tasa actual.",
    );

    lastResultText =
      "Tasa sugerida: " +
      formatterRate.format(suggestedRate) +
      " VES/USD\nPrecio sugerido: " +
      formatterVES.format(suggestedPrice) +
      "\nAjuste sobre tasa actual: " +
      formatterPercent.format(extraPercent * 100) +
      "%";

    drawChart(projection, suggestedRate);
    saveState();
  }

  function copyResult() {
    if (!lastResultText) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastResultText).then(
        function () {
          setText(copyButton, "Copiado");
          window.setTimeout(function () {
            setText(copyButton, "Copiar resultado");
          }, 1600);
        },
        function () {
          window.prompt("Copia el resultado", lastResultText);
        },
      );
    } else {
      window.prompt("Copia el resultado", lastResultText);
    }
  }

  function init() {
    if (!form) return;
    restoreState();
    updateModeButtons();
    calculate();

    form.addEventListener("input", calculate);
    form.addEventListener("change", calculate);
    window.addEventListener("resize", calculate);

    modeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        selectedMode = button.dataset.mode;
        updateModeButtons();
        calculate();
      });
    });

    if (copyButton) copyButton.addEventListener("click", copyResult);

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("./service-worker.js?v=4").catch(function () {});
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
