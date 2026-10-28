
"use strict";

let elasticityRequestId = 0;

async function refreshElasticityEvidence() {
  const requestId = ++elasticityRequestId;
  const country = document.getElementById("country").value;
  const body = document.getElementById("elasticityTableBody");
  const status = document.getElementById("elasticityStatus");

  body.replaceChildren();
  status.textContent = "Loading elasticity estimates...";

  try {
    const response = await fetch(
      "/api/food-demand/elasticities",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    if (requestId !== elasticityRequestId) return;

    function formatCoefficient(value) {
      return typeof value === "number"
        ? value.toFixed(3)
        : "Unavailable";
    }

    data.food_groups.forEach(group => {
      const row = document.createElement("tr");

      const cells = [
        group.food_group,
        formatCoefficient(group.own_price_elasticity),
        formatCoefficient(group.income_elasticity),
        typeof group.baseline_g_day === "number"
          ? group.baseline_g_day.toFixed(2)
          : "Unavailable"
      ];

      cells.forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });

      body.append(row);
    });

    status.textContent =
      `${country} · Workbook-based elasticity estimates`;

  } catch (error) {
    if (requestId !== elasticityRequestId) return;

    body.replaceChildren();
    status.textContent =
      `Data unavailable: ${error.message}`;

    console.error("Elasticity evidence error:", error);
  }
}

document.getElementById("country").addEventListener(
  "change",
  refreshElasticityEvidence
);

refreshElasticityEvidence();
