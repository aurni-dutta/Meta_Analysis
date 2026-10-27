
"use strict";
console.log("Nutrient API script loaded!");

// Nutrient calculations from Andrew's workbooks.
// Runs after food_demand.js and updates its existing nutrient bars.

let nutrientApiRequest = 0;

async function refreshWorkbookNutrients() {
  const requestId = ++nutrientApiRequest;

  const country = document.getElementById("country").value;
  const shock = Number(document.getElementById("shock").value);
  const nutrient = document.getElementById("nutrientSelect").value;
  const focus = document.getElementById("nutrientFocus");

  // selectedView is declared in food_demand.js.
  if (selectedView !== "own" && selectedView !== "income") {
    nutrientBars.forEach(({ fill, valueLabel }) => {
      fill.style.width = "0%";
      valueLabel.textContent = "N/A";
    });

    focus.textContent =
      "Workbook nutrient results are not available for this scenario.";
    return;
  }

  focus.textContent = "Loading workbook nutrient data...";

  try {
    const response = await fetch("/api/food-demand/nutrients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country,
        scenario: selectedView,
        shock: shock / 100
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Nutrient API request failed");
    }

    if (requestId !== nutrientApiRequest) return;

    const changes = result.nutrient_changes_percent;

    nutrientNames.forEach((name, index) => {
      const percentage = changes[name];
      const { fill, valueLabel } = nutrientBars[index];
      const row = fill.closest(".nutrient-row");

      row.classList.toggle("highlighted", name === nutrient);

      if (typeof percentage !== "number") {
        fill.style.width = "0%";
        valueLabel.textContent = "N/A";
        return;
      }

      const width = Math.min(
        49,
        Math.abs(percentage) / 30 * 49
      );

      fill.classList.toggle("loss", percentage < 0);
      fill.style.left = `${percentage < 0 ? 50 - width : 50}%`;
      fill.style.width = `${width}%`;

      valueLabel.textContent =
        `${percentage > 0 ? "+" : ""}${percentage.toFixed(2)}%`;
    });

    const current = changes[nutrient];
    const missing = result.missing_elasticity_groups || [];

    focus.textContent =
      `${country} · ${nutrient}: ` +
      `${current > 0 ? "+" : ""}${current.toFixed(2)}% ` +
      "(workbook-based national nutrient-supply change)" +
      (missing.length
        ? `. Missing elasticities: ${missing.join(", ")}.`
        : "");

  } catch (error) {
    if (requestId !== nutrientApiRequest) return;

    focus.textContent = `Nutrient API error: ${error.message}`;
    console.error(error);
  }
}

// Run after food_demand.js's event listeners.
["country", "shock", "nutrientSelect"].forEach(id => {
  document.getElementById(id).addEventListener(
    id === "shock" ? "input" : "change",
    refreshWorkbookNutrients
  );
});

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", refreshWorkbookNutrients);
});

// Initial workbook-backed nutrient result.
refreshWorkbookNutrients();


async function refreshWorkbookResponseCurve() {
  const curve = document.getElementById("responseCurve");
  const subtitle = document.getElementById("curveSubtitle");
  const currentLabel = document.getElementById("curveCurrent");

  const country = document.getElementById("country").value;
  const nutrient = document.getElementById("nutrientSelect").value;
  const shock = Number(document.getElementById("shock").value);

  if (selectedView !== "own" && selectedView !== "income") {
    curve.replaceChildren();
    currentLabel.textContent =
      "Workbook response curve unavailable for this scenario.";
    return;
  }

  subtitle.textContent =
    `${nutrient}: modeled national nutrient-supply change from −30% to +30%`;

  // This model is linear in the shock. The API result at +10%
  // gives the slope of the entire response curve.
  const response = await fetch("/api/food-demand/nutrients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      country,
      scenario: selectedView,
      shock: 0.10
    })
  });

  if (!response.ok) {
    throw new Error(`Curve API returned HTTP ${response.status}`);
  }

  const result = await response.json();
  const valueAtTen = result.nutrient_changes_percent[nutrient];

  const points = [];
  for (let x = -30; x <= 30; x += 5) {
    points.push({
      shock: x,
      change: valueAtTen * (x / 10)
    });
  }

  const maxAbs = Math.max(
    1,
    ...points.map(point => Math.abs(point.change))
  );

  const xCoord = x => 70 + ((x + 30) / 60) * 650;
  const yCoord = y => 140 - (y / maxAbs) * 105;

  const path = points.map((point, index) =>
    `${index === 0 ? "M" : "L"} ${xCoord(point.shock)} ${yCoord(point.change)}`
  ).join(" ");

  const currentChange = valueAtTen * (shock / 10);

  curve.innerHTML = `
    <line x1="70" y1="140" x2="720" y2="140"
          stroke="#a1a1aa" stroke-dasharray="5 5"/>
    <path d="${path}" fill="none" stroke="#2563eb"
          stroke-width="3" stroke-linecap="round"/>
    <line x1="${xCoord(shock)}" y1="30"
          x2="${xCoord(shock)}" y2="245"
          stroke="#93c5fd" stroke-dasharray="5 5"/>
    <circle cx="${xCoord(shock)}" cy="${yCoord(currentChange)}"
            r="6" fill="#2563eb" stroke="white" stroke-width="2"/>
    <text x="70" y="265" font-size="13" fill="#71717a">−30%</text>
    <text x="395" y="265" text-anchor="middle"
          font-size="13" fill="#71717a">0%</text>
    <text x="720" y="265" text-anchor="end"
          font-size="13" fill="#71717a">+30%</text>
    <text x="60" y="35" text-anchor="end"
          font-size="12" fill="#71717a">+${maxAbs.toFixed(1)}%</text>
    <text x="60" y="140" text-anchor="end"
          font-size="12" fill="#71717a">0%</text>
    <text x="60" y="245" text-anchor="end"
          font-size="12" fill="#71717a">−${maxAbs.toFixed(1)}%</text>
  `;

  currentLabel.textContent =
    `${country} · ${nutrient}: ${currentChange >= 0 ? "+" : ""}` +
    `${currentChange.toFixed(2)}% at ${shock >= 0 ? "+" : ""}${shock}% ` +
    "(workbook-based model)";
}

["country", "nutrientSelect"].forEach(id => {
  document.getElementById(id).addEventListener(
    "change",
    () => refreshWorkbookResponseCurve().catch(console.error)
  );
});

document.getElementById("shock").addEventListener(
  "input",
  () => refreshWorkbookResponseCurve().catch(console.error)
);

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener(
    "click",
    () => refreshWorkbookResponseCurve().catch(console.error)
  );
});

refreshWorkbookResponseCurve().catch(console.error);