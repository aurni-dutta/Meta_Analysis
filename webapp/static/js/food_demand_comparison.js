
"use strict";

// Compare workbook-backed nutrient impacts.
// This module does not modify existing charts or model formulas.

(() => {
  const byId = id => document.getElementById(id);

  const nutrients = [
    "Energy", "Protein", "Fat",
    "Iron", "Zinc", "Vitamin A"
  ];

  const runButton = byId("runScenarioComparison");
  const status = byId("compareStatus");
  const tableBody = byId("compareResultsBody");

  if (!runButton || !status || !tableBody) return;

  let latestRequest = 0;

  function readScenario(letter) {
    const country = byId(`compareCountry${letter}`).value;
    const scenario = byId(`compareScenario${letter}`).value;
    const shockPercent = Number(byId(`compareShock${letter}`).value);

    if (!Number.isFinite(shockPercent) ||
        shockPercent < -30 ||
        shockPercent > 30) {
      throw new Error(
        `Scenario ${letter}: shock must be between -30% and +30%.`
      );
    }

    return {
      country,
      scenario,
      shock: shockPercent / 100
    };
  }

  async function fetchNutrients(payload) {
    const response = await fetch(
      "/api/food-demand/nutrients",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data.nutrient_changes_percent;
  }

  function formatPercent(value) {
    return typeof value === "number" && Number.isFinite(value)
      ? `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
      : "Unavailable";
  }

  function formatPoints(value) {
    return typeof value === "number" && Number.isFinite(value)
      ? `${value > 0 ? "+" : ""}${value.toFixed(2)} pp`
      : "Unavailable";
  }

  async function compareScenarios() {
    const requestId = ++latestRequest;
    tableBody.replaceChildren();

    let scenarioA;
    let scenarioB;

    try {
      scenarioA = readScenario("A");
      scenarioB = readScenario("B");
    } catch (error) {
      status.textContent = error.message;
      return;
    }

    runButton.disabled = true;
    status.textContent = "Loading comparison...";

    try {
      const [resultsA, resultsB] = await Promise.all([
        fetchNutrients(scenarioA),
        fetchNutrients(scenarioB)
      ]);

      if (requestId !== latestRequest) return;

      nutrients.forEach(nutrient => {
        const valueA = resultsA?.[nutrient];
        const valueB = resultsB?.[nutrient];

        const difference =
          typeof valueA === "number" &&
          typeof valueB === "number"
            ? valueB - valueA
            : null;

        const row = document.createElement("tr");

        [
          nutrient,
          formatPercent(valueA),
          formatPercent(valueB),
          formatPoints(difference)
        ].forEach(value => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        });

        tableBody.append(row);
      });

      status.textContent =
        `Scenario A: ${scenarioA.country} · ` +
        `${scenarioA.scenario} · ${scenarioA.shock * 100}% | ` +
        `Scenario B: ${scenarioB.country} · ` +
        `${scenarioB.scenario} · ${scenarioB.shock * 100}%`;

    } catch (error) {
      if (requestId !== latestRequest) return;

      tableBody.replaceChildren();
      status.textContent = `Comparison unavailable: ${error.message}`;
      console.error("Scenario comparison error:", error);

    } finally {
      if (requestId === latestRequest) {
        runButton.disabled = false;
      }
    }
  }

  runButton.addEventListener("click", compareScenarios);

  // Clear old results if inputs change.
  [
    "compareCountryA", "compareScenarioA", "compareShockA",
    "compareCountryB", "compareScenarioB", "compareShockB"
  ].forEach(id => {
    byId(id).addEventListener("input", () => {
      ++latestRequest;
      runButton.disabled = false;
      tableBody.replaceChildren();
      status.textContent = "Settings changed. Click Compare scenarios.";
    });
  });

  compareScenarios();
})();
