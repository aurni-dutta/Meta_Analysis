
"use strict";

// Displays existing workbook-based results.
// Does not introduce new model calculations.

(() => {
  const byId = id => document.getElementById(id);
  const supported = ["own", "income"];
  let latestRequest = 0;

  const displayNumber = value =>
    typeof value === "number" && Number.isFinite(value)
      ? value.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      : "Unavailable";

  const displayPercent = value =>
    typeof value === "number" && Number.isFinite(value)
      ? `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
      : "Unavailable";

  async function postJSON(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  async function refreshSummary() {
    const requestId = ++latestRequest;

    const country = byId("country").value;
    const foodGroup = byId("foodGroup").value;
    const shock = Number(byId("shock").value) / 100;
    const scenario =
      document.querySelector(".tabs [data-view].active")
        ?.dataset.view || "own";

    const fields = [
      "summaryBaseline",
      "summaryPredicted",
      "summaryFoodChange",
      "summaryEnergy"
    ];

    fields.forEach(id => byId(id).textContent = "—");

    if (!supported.includes(scenario)) {
      byId("summaryStatus").textContent =
        "Summary unavailable for Cross-price and Tariff scenarios.";
      return;
    }

    byId("summaryStatus").textContent =
      `${country} · ${scenario === "own" ? "Own-price" : "Income"} · ` +
      `${shock >= 0 ? "+" : ""}${Math.round(shock * 100)}% · ` +
      `${foodGroup}`;

    try {
      const [food, nutrients] = await Promise.all([
        postJSON("/api/food-demand/simulate", {
          country, scenario, shock, food_group: foodGroup
        }),
        postJSON("/api/food-demand/nutrients", {
          country, scenario, shock
        })
      ]);

      if (requestId !== latestRequest) return;

      byId("summaryBaseline").textContent =
        displayNumber(food.baseline_g_day);

      byId("summaryPredicted").textContent =
        displayNumber(food.predicted_g_day);

      byId("summaryFoodChange").textContent =
        displayPercent(food.change_percent);

      byId("summaryEnergy").textContent =
        displayPercent(
          nutrients.nutrient_changes_percent?.Energy
        );

    } catch (error) {
      if (requestId !== latestRequest) return;

      fields.forEach(id => byId(id).textContent = "—");
      byId("summaryStatus").textContent =
        `Data unavailable: ${error.message}`;

      console.error("Scenario summary error:", error);
    }
  }

  // Reuse the existing dashboard controls.
  ["country", "foodGroup"].forEach(id => {
    byId(id).addEventListener("change", refreshSummary);
  });

  byId("shock").addEventListener("input", refreshSummary);

  document.querySelectorAll(".tabs [data-view]").forEach(button => {
    button.addEventListener("click", refreshSummary);
  });

  refreshSummary();
})();
