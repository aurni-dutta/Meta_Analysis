
"use strict";

// Download workbook-based scenario results as CSV.
// Uses existing APIs; no new model calculations.

(() => {
  const button = document.getElementById("exportScenarioCsv");
  const status = document.getElementById("exportScenarioStatus");

  if (!button || !status) return;

  const nutrients = [
    "Energy", "Protein", "Fat",
    "Iron", "Zinc", "Vitamin A"
  ];

  async function postJSON(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  function csvCell(value) {
    if (value === null || value === undefined) {
      return "";
    }

    let text = String(value);

    // Prevent spreadsheet applications from interpreting
    // text fields as executable formulas.
    if (/^[\s]*[=+\-@\t\r]/.test(text) &&
        typeof value !== "number") {
      text = "'" + text;
    }

    return '"' + text.replace(/"/g, '""') + '"';
  }

  function csvRow(...values) {
    return values.map(csvCell).join(",");
  }

  function safeFilename(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  button.addEventListener("click", async () => {
    const country = document.getElementById("country").value;
    const scenario = document.querySelector(
      ".tabs [data-view].active"
    )?.dataset.view;

    const shock = Number(
      document.getElementById("shock").value
    ) / 100;

    if (!["own", "income"].includes(scenario)) {
      status.textContent =
        "CSV export is available for Own-price and Income only.";
      return;
    }

    button.disabled = true;
    status.textContent = "Preparing CSV...";

    try {
      const [supply, nutrition] = await Promise.all([
        postJSON("/api/food-demand/simulate-all", {
          country, scenario, shock
        }),
        postJSON("/api/food-demand/nutrients", {
          country, scenario, shock
        })
      ]);

      const rows = [];

      // Metadata and interpretation
      rows.push(csvRow("Field", "Value"));
      rows.push(csvRow("Country", country));
      rows.push(csvRow("Scenario", scenario));
      rows.push(csvRow("Shock (%)", shock * 100));
      rows.push(csvRow("Baseline year", 2023));
      rows.push(csvRow(
        "Data basis",
        "FAO food supply and country-specific model workbooks"
      ));
      rows.push(csvRow(
        "Scenario assumption",
        scenario === "own"
          ? "Same percentage shock applied separately to each food group's own price"
          : "Same percentage food-spending shock applied to each modeled group"
      ));
      rows.push(csvRow(
        "Interpretation",
        "Modeled national food supply, not measured dietary intake"
      ));
      rows.push(csvRow(
        "Missing estimates",
        "Unavailable coefficients are not treated as zero"
      ));

      rows.push("");

      // Food-group supply results
      rows.push(csvRow(
        "Food group",
        "Baseline supply (g/person/day)",
        "Predicted supply (g/person/day)",
        "Elasticity",
        "Supply change (%)"
      ));

      (supply.food_groups || []).forEach(group => {
        rows.push(csvRow(
          group.food_group,
          group.baseline_g_day,
          group.predicted_g_day,
          group.elasticity,
          group.change_percent
        ));
      });

      rows.push("");

      // National nutrient changes
      rows.push(csvRow(
        "Nutrient",
        "Modeled national supply change (%)"
      ));

      nutrients.forEach(nutrient => {
        rows.push(csvRow(
          nutrient,
          nutrition.nutrient_changes_percent?.[nutrient]
        ));
      });

      const missing = nutrition.missing_elasticity_groups || [];

      rows.push("");
      rows.push(csvRow(
        "Food groups with missing elasticities",
        missing.join("; ") || "None reported"
      ));

      const csv = "\uFEFF" + rows.join("\r\n") + "\r\n";
      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8"
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const shockLabel = (shock * 100 >= 0 ? "plus" : "minus") +
        Math.abs(Math.round(shock * 100));

      link.href = url;
      link.download =
        `food-demand-${safeFilename(country)}-` +
        `${scenario}-${shockLabel}pct.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      // Keep the object URL alive until after the download starts.
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      status.textContent = "CSV ready.";

    } catch (error) {
      status.textContent =
        `Export unavailable: ${error.message}`;
      console.error("CSV export failed:", error);

    } finally {
      button.disabled = false;
    }
  });
})();
