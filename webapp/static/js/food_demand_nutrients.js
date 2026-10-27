
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
