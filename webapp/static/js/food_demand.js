
"use strict";


/*
 * Food groups as defined in Andrew's Excel workbooks.
 * These names must match the workbook labels exactly.
 */
const workbookFoodGroups = [
  "Grains and vegetables",
  "Meat and eggs",
  "Edible oil",
  "Aquatic products",
  "Fruits",
  "Sugar",
  "Dairy",
  "Alcohol",
  "Ungrouped / other"
];

/**
 * Request real food-supply predictions from Flask.
 *
 * The Flask endpoint reads Andrew's workbook and returns
 * baseline and predicted quantities in g/person/day.
 */
async function fetchWorkbookFoodData(country, scenario, shockPercent) {
  const results = await Promise.all(
    workbookFoodGroups.map(async (foodGroup) => {
      const response = await fetch("/api/food-demand/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          country: country,
          scenario: scenario,
          food_group: foodGroup,
          shock: shockPercent / 100
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `${foodGroup}: ${data.error || "Request failed"}`
        );
      }

      return data;
    })
  );

  return results;
}


// DEMONSTRATION DATA ONLY.
// These quantities and coefficients are illustrative, not research results.

const foodGroups = [
  { name: "Fruits & vegetables", actual: 260, recommended: 400 },
  { name: "Meats", actual: 145, recommended: 115 },
  { name: "Grains", actual: 350, recommended: 330 },
  { name: "Dairy", actual: 110, recommended: 220 },
  { name: "Fats & oils", actual: 58, recommended: 50 },
  { name: "Seafood", actual: 50, recommended: 80 }
];

const scenarioLabels = {
  own: { title: "Own-price scenario", slider: "Price change" },
  cross: { title: "Cross-price scenario", slider: "Price change" },
  income: { title: "Income scenario", slider: "Food spending change" },
  tariff: { title: "Tariff scenario", slider: "Tariff change (percentage points)" }
};

// Made-up animation patterns, NOT measured elasticity coefficients.
const animationPatterns = {
  own:    [-0.8, -0.3, -1.0, -0.5, -0.6, -0.2],
  cross:  [ 0.5, -0.5,  0.4,  0.8, -0.3,  0.6],
  income: [ 0.7,  0.4,  0.5,  0.9,  0.2,  0.8],
  tariff: [-0.3, -0.12, -0.4, -0.2, -0.15, -0.08]
};

const SCALE_MAX = 520;
const byId = (id) => document.getElementById(id);
const predictedBars = [];
let selectedView = "own";

function barHeight(quantity) {
  return `${Math.min(100, Math.max(0, quantity) / SCALE_MAX * 100)}%`;
}

function createBar(colorClass, quantity, tooltip) {
  const bar = document.createElement("div");
  bar.className = `bar ${colorClass}`;
  bar.style.height = barHeight(quantity);
  bar.title = tooltip;
  return bar;
}

function buildChart() {
  const plot = byId("plot");
  const labels = byId("labels");

  foodGroups.forEach((food) => {
    const category = document.createElement("div");
    category.className = "category";

    const group = document.createElement("div");
    group.className = "bar-group";

    const actualBar = createBar(
      "orange",
      food.actual,
      `${food.name}: illustrative baseline (${food.actual})`
    );

    const predictedBar = createBar(
      "blue",
      food.actual,
      `${food.name}: illustrative predicted quantity`
    );

    const recommendedBar = createBar(
      "green",
      food.recommended,
      `${food.name}: illustrative recommended quantity (${food.recommended})`
    );

    group.append(actualBar, predictedBar, recommendedBar);
    category.append(group);
    plot.append(category);

    const label = document.createElement("div");
    label.textContent = food.name;
    labels.append(label);

    predictedBars.push(predictedBar);
  });
}

// Nutrient categories follow Andrew's workbook.
// The coefficients below are illustrative only.
const nutrientNames = [
  "Energy",
  "Protein",
  "Fat",
  "Iron",
  "Zinc",
  "Vitamin A"
];

const nutrientDemoPatterns = {
  own:    [-0.41, -0.43, -0.26, -0.50, -0.31, -0.15],
  cross:  [-0.37, -0.31, -0.18, -0.47, -0.25,  0.12],
  income: [ 0.97,  0.74,  0.68,  0.83,  0.65,  0.48],
  tariff: [-0.22, -0.18, -0.14, -0.24, -0.15, -0.07]
};

const nutrientBars = [];

function buildNutrientChart() {
  const container = byId("nutrientChart");

  nutrientNames.forEach((name) => {
    const row = document.createElement("div");
    row.className = "nutrient-row";

    const label = document.createElement("div");
    label.className = "nutrient-label";
    label.textContent = name;

    const track = document.createElement("div");
    track.className = "nutrient-track";

    const center = document.createElement("div");
    center.className = "nutrient-zero";

    const fill = document.createElement("div");
    fill.className = "nutrient-fill";

    const valueLabel = document.createElement("div");
    valueLabel.className = "nutrient-value";

    track.append(center, fill);
    row.append(label, track, valueLabel);
    container.append(row);

    nutrientBars.push({ fill, valueLabel });
  });
}

function updateNutrientChart(shock) {
  const selectedNutrient = byId("nutrientSelect").value;
  let selectedValue = 0;

  nutrientDemoPatterns[selectedView].forEach(
    (coefficient, index) => {
      const passThrough =
        selectedView === "tariff"
          ? Number(byId("passThrough").value) / 100
          : 1;

      const percentage = coefficient * shock * passThrough;

      if (nutrientNames[index] === selectedNutrient) {
        selectedValue = percentage;
      }

      const width = Math.min(
        49,
        Math.abs(percentage) / 30 * 49
      );

      const { fill, valueLabel } = nutrientBars[index];

      fill.classList.toggle("loss", percentage < 0);
      fill.style.left = `${percentage < 0 ? 50 - width : 50}%`;
      fill.style.width = `${width}%`;

      valueLabel.textContent =
        `${percentage > 0 ? "+" : ""}${percentage.toFixed(1)}%`;

      const row = fill.closest(".nutrient-row");

      row.classList.toggle(
        "highlighted",
        nutrientNames[index] === selectedNutrient
      );
    }
  );

  byId("nutrientFocus").textContent =
    `${selectedNutrient} highlighted: ` +
    `${selectedValue > 0 ? "+" : ""}` +
    `${selectedValue.toFixed(1)}% (illustrative only)`;
}

// Draw an illustrative nutrient response curve.
function updateResponseCurve(shock) {
  const nutrient = byId("nutrientSelect").value;
  const index = nutrientNames.indexOf(nutrient);
  const coefficient = nutrientDemoPatterns[selectedView][index];

  const passThrough =
    selectedView === "tariff"
      ? Number(byId("passThrough").value) / 100
      : 1;

  const calculate = (size) => coefficient * size * passThrough;

  const svg = byId("responseCurve");
  const NS = "http://www.w3.org/2000/svg";

  svg.replaceChildren();

  const x0 = 68;
  const x1 = 735;
  const y0 = 22;
  const y1 = 230;

  const samples = Array.from(
    { length: 61 },
    (_, i) => i - 30
  );

  const values = samples.map(calculate);

  const extent =
    Math.max(1, ...values.map((v) => Math.abs(v))) * 1.12;

  const x = (size) =>
    x0 + (size + 30) / 60 * (x1 - x0);

  const y = (value) =>
    (y0 + y1) / 2 -
    value / extent * (y1 - y0) / 2;

  function shape(tag, attrs, text) {
    const node = document.createElementNS(NS, tag);

    Object.entries(attrs).forEach(([key, value]) => {
      node.setAttribute(key, String(value));
    });

    if (text !== undefined) {
      node.textContent = text;
    }

    svg.append(node);
    return node;
  }

  [-extent, 0, extent].forEach((value) => {
    shape("line", {
      x1: x0,
      x2: x1,
      y1: y(value),
      y2: y(value),
      stroke: value === 0 ? "#a1a1aa" : "#e4e4e7",
      "stroke-dasharray": value === 0 ? "4 4" : "none"
    });

    shape(
      "text",
      {
        x: x0 - 10,
        y: y(value) + 4,
        "text-anchor": "end",
        fill: "#71717a",
        "font-size": 12
      },
      `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
    );
  });

  [-30, -20, -10, 0, 10, 20, 30].forEach((value) => {
    shape(
      "text",
      {
        x: x(value),
        y: 251,
        "text-anchor": "middle",
        fill: "#71717a",
        "font-size": 12
      },
      `${value}%`
    );
  });

  const points = samples
    .map((size) => `${x(size)},${y(calculate(size))}`)
    .join(" ");

  shape("polyline", {
    points,
    fill: "none",
    stroke: "#2563eb",
    "stroke-width": 3,
    "stroke-linejoin": "round"
  });

  shape("line", {
    x1: x(shock),
    x2: x(shock),
    y1: y0,
    y2: y1,
    stroke: "#93c5fd",
    "stroke-dasharray": "5 5"
  });

  shape("circle", {
    cx: x(shock),
    cy: y(calculate(shock)),
    r: 7,
    fill: "#2563eb",
    stroke: "white",
    "stroke-width": 3
  });

  const units =
    selectedView === "tariff" ? "percentage points" : "%";

  byId("curveSubtitle").textContent =
    `${nutrient}: illustrative response from −30 to +30 ${units}`;

  byId("curveCurrent").textContent =
    `Current ${nutrient.toLowerCase()} change: ` +
    `${calculate(shock) > 0 ? "+" : ""}` +
    `${calculate(shock).toFixed(1)}% ` +
    `(at ${shock > 0 ? "+" : ""}${shock} ${units}; demo only)`;

  svg.setAttribute(
    "aria-label",
    `${nutrient} demo response curve; current shock ${shock} ${units}`
  );
}

function updateView() {
  const config = scenarioLabels[selectedView];
  const shock = Number(byId("shock").value);

  const signedShock =
    `${shock > 0 ? "+" : ""}${shock}%`;

  byId("chartTitle").textContent = config.title;
  byId("shockLabel").textContent = config.slider;

  byId("shockText").textContent =
    selectedView === "tariff"
      ? `${shock > 0 ? "+" : ""}${shock} pp`
      : signedShock;

  byId("foodGroupField").hidden =
    selectedView === "income" || selectedView === "tariff";

  byId("passThroughField").hidden =
    selectedView !== "tariff";

  byId("passThroughText").textContent =
    `${byId("passThrough").value}%`;

  foodGroups.forEach((food, index) => {
    const pattern = animationPatterns[selectedView][index];

    const passThrough =
      selectedView === "tariff"
        ? Number(byId("passThrough").value) / 100
        : 1;

    // ILLUSTRATIVE calculation, not Andrew's model.
    const illustrativePrediction = Math.max(
      0,
      food.actual * (
        1 + pattern * shock * passThrough / 100
      )
    );

    const bar = predictedBars[index];
    if (!bar) return;

    bar.style.height = barHeight(illustrativePrediction);

    bar.title =
      `${byId("country").value} · ${food.name}: ` +
      `illustrative predicted quantity ` +
      `(${illustrativePrediction.toFixed(1)}; not research data)`;
  });

  const groupHint =
    selectedView === "own" || selectedView === "cross"
      ? ` Selected food group: ${byId("foodGroup").value}.`
      : "";

  byId("scenarioNote").textContent =
    `UI preview · ${config.slider.toLowerCase()}: ` +
    `${signedShock}.${groupHint} ` +
    "Country and food-group choices do not yet load model data. " +
    "Values are illustrative, not predictions.";

  updateNutrientChart(shock);
  updateResponseCurve(shock);

  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === selectedView;

    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

// Scenario tab interactions.
document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedView = button.dataset.view;
    updateView();
  });
});

// Dropdown and slider interactions.
[
  "shock",
  "country",
  "foodGroup",
  "passThrough",
  "nutrientSelect"
].forEach((id) => {
  byId(id).addEventListener(
    id === "shock" || id === "passThrough"
      ? "input"
      : "change",
    updateView
  );
});

// Initialize nutrient preview and scenario controls.
// The real food-supply chart loads from Flask separately.
buildNutrientChart();
updateView();

  
// ------------------------------------------------------------
// Real workbook-backed food-supply chart
// ------------------------------------------------------------

let chartRequestNumber = 0;
let chartUpdateTimer = null;

const realChartGroups = [
  "Grains and vegetables",
  "Meat and eggs",
  "Edible oil",
  "Aquatic products",
  "Fruits",
  "Sugar",
  "Dairy",
  "Alcohol",
  "Ungrouped / other"
];

function drawRealFoodChart(rows) {
  const plot = document.getElementById("plot");
  const labels = document.getElementById("labels");

  plot.replaceChildren();
  labels.replaceChildren();

  // A shared scale makes bar heights comparable across groups.
  const maxQuantity = Math.max(
    1,
    ...rows.flatMap(row => [
      row.baseline_g_day || 0,
      row.predicted_g_day || 0
    ])
  );

  rows.forEach(row => {
    const category = document.createElement("div");
    category.className = "category";

    const group = document.createElement("div");
    group.className = "bar-group";

    const baseline = document.createElement("div");
    baseline.className = "bar orange";
    baseline.style.height =
      `${100 * row.baseline_g_day / maxQuantity}%`;
    baseline.title =
      `${row.food_group}: ${row.baseline_g_day} g/person/day (FAO baseline)`;

    const predicted = document.createElement("div");
    predicted.className = "bar blue";

    if (row.predicted_g_day === null) {
      predicted.style.height = "0";
      predicted.title =
        `${row.food_group}: prediction unavailable (no elasticity estimate)`;
    } else {
      predicted.style.height =
        `${100 * row.predicted_g_day / maxQuantity}%`;
      predicted.title =
        `${row.food_group}: ${row.predicted_g_day} g/person/day (predicted)`;
    }

    // No green bar until validated recommendation targets exist.
    group.append(baseline, predicted);
    category.append(group);
    plot.append(category);

    const label = document.createElement("div");
    label.textContent = row.food_group;
    labels.append(label);
  });
}

async function refreshRealFoodChart() {
  const requestNumber = ++chartRequestNumber;

  // Cross-price and tariff are not implemented in the Flask API yet.
  if (selectedView !== "own" && selectedView !== "income") {
    // Restore the original illustrative bars for preview-only tabs.
    document.getElementById("plot").replaceChildren();
    document.getElementById("labels").replaceChildren();
    predictedBars.length = 0;
    buildChart();
    updateView();
    return;
  }

  const country = document.getElementById("country").value;
  const shock = Number(document.getElementById("shock").value);

  document.getElementById("scenarioNote").textContent =
    "Loading workbook-backed food supply data...";

  try {
    const response = await fetch(
      "/api/food-demand/simulate-all",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: country,
          scenario: selectedView,
          shock: shock / 100
        })
      }
    );

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      throw new Error(
        `Flask returned HTTP ${response.status} instead of JSON. ` +
        "Check that /api/food-demand/simulate-all exists on this server."
      );
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "API request failed");
    }

    // Ignore responses from older slider positions.
    if (requestNumber !== chartRequestNumber) return;

    drawRealFoodChart(result.food_groups);

    document.getElementById("scenarioNote").textContent =
      `${country} · ${selectedView === "own" ? "Own-price" : "Income"} ` +
      `· ${shock > 0 ? "+" : ""}${shock}% · ` +
      "Orange = FAO 2023 baseline; blue = model prediction. " +
      "Missing estimates are unavailable, not zero. " +
      "The same shock is applied separately to each group. " +
      "Nutrient graphics below remain illustrative.";

  } catch (error) {
    if (requestNumber !== chartRequestNumber) return;

    document.getElementById("plot").replaceChildren();
    document.getElementById("labels").replaceChildren();

    document.getElementById("scenarioNote").textContent =
      `Unable to load workbook data: ${error.message}`;
  }
}

function scheduleRealChartUpdate() {
  clearTimeout(chartUpdateTimer);
  chartUpdateTimer = setTimeout(refreshRealFoodChart, 180);
}

// These handlers run after the original demo handlers.
// They replace the visible chart with workbook results on supported tabs.
document.getElementById("country").addEventListener(
  "change", scheduleRealChartUpdate
);

document.getElementById("shock").addEventListener(
  "input", scheduleRealChartUpdate
);

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", scheduleRealChartUpdate);
});

// Load the default Nigeria scenario.
refreshRealFoodChart();
