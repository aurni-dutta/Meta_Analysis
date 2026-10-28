
"use strict";

(() => {
  const byId = id => document.getElementById(id);

  const runButton = byId("runTargetedShock");
  const country = byId("targetedCountry");
  const foodGroup = byId("targetedFoodGroup");
  const shockInput = byId("targetedShock");
  const status = byId("targetedStatus");
  const results = byId("targetedResults");
  const body = byId("targetedNutrientsBody");

  if (!runButton || !country || !foodGroup ||
      !shockInput || !status || !results || !body) {
    return;
  }

  const nutrientOrder = [
    "Energy", "Protein", "Fat", "Iron", "Zinc", "Vitamin A"
  ];

  const formatPercent = value =>
    typeof value === "number" && Number.isFinite(value)
      ? `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
      : "Unavailable";

  let requestNumber = 0;

  async function runScenario() {
    const currentRequest = ++requestNumber;
    const rawShock = shockInput.value.trim();
    const shockPercent = Number(rawShock);

    results.hidden = true;
    body.replaceChildren();

    if (
      !rawShock ||
      !Number.isFinite(shockPercent) ||
      shockPercent < -30 ||
      shockPercent > 30
    ) {
      status.textContent = "Enter a price change between −30% and +30%.";
      return;
    }

    runButton.disabled = true;
    status.textContent = "Calculating targeted scenario...";

    try {
      const response = await fetch(
        "/api/food-demand/targeted-price",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            country: country.value,
            food_group: foodGroup.value,
            shock: shockPercent / 100
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (currentRequest !== requestNumber) return;

      byId("targetedElasticity").textContent =
        data.own_price_elasticity.toFixed(3);

      byId("targetedBaseline").textContent =
        `${data.baseline_g_day.toFixed(2)} g/person/day`;

      byId("targetedPredicted").textContent =
        `${data.predicted_g_day.toFixed(2)} g/person/day`;

      byId("targetedQuantityChange").textContent =
        formatPercent(data.quantity_change_percent);

      nutrientOrder.forEach(nutrient => {
        const row = document.createElement("tr");
        const name = document.createElement("td");
        const value = document.createElement("td");

        name.textContent = nutrient;
        value.textContent = formatPercent(
          data.nutrient_changes_percent[nutrient]
        );

        row.append(name, value);
        body.append(row);
      });

      results.hidden = false;
      status.textContent =
        `Results for ${data.country}: ${data.food_group}. ` +
        "Cross-price effects are not included.";

    } catch (error) {
      if (currentRequest === requestNumber) {
        status.textContent = `Unable to calculate: ${error.message}`;
      }
    } finally {
      if (currentRequest === requestNumber) {
        runButton.disabled = false;
      }
    }
  }

  runButton.addEventListener("click", runScenario);
})();
