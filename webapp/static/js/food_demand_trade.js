
"use strict";

// Workbook-based import dependency chart.
// No tariff or trade-policy simulation is performed here.

(() => {
  const countrySelect = document.getElementById("country");
  const chart = document.getElementById("tradeExposureChart");
  const status = document.getElementById("tradeExposureStatus");

  if (!countrySelect || !chart || !status) return;

  let latestRequest = 0;

  async function refreshTradeExposure() {
    const requestId = ++latestRequest;
    const country = countrySelect.value;

    chart.replaceChildren();
    status.textContent = "Loading trade exposure...";

    try {
      const response = await fetch(
        "/api/food-demand/trade-exposure",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (requestId !== latestRequest) return;

      data.food_groups.forEach(item => {
        const row = document.createElement("div");
        row.className = "trade-exposure-row";

        const name = document.createElement("span");
        name.className = "trade-exposure-name";
        name.textContent = item.food_group;

        const track = document.createElement("div");
        track.className = "trade-exposure-track";

        const fill = document.createElement("div");
        fill.className = "trade-exposure-fill";

        const valid = typeof item.import_dependency_percent === "number"
          && Number.isFinite(item.import_dependency_percent);

        fill.style.width = valid
          ? `${Math.max(0, Math.min(100, item.import_dependency_percent))}%`
          : "0%";

        track.append(fill);

        const value = document.createElement("strong");
        value.className = "trade-exposure-value";
        value.textContent = valid
          ? `${item.import_dependency_percent.toFixed(1)}%`
          : "Unavailable";

        row.append(name, track, value);
        chart.append(row);
      });

      status.textContent =
        `${country} · Kcal-weighted import dependency · 2023`;

    } catch (error) {
      if (requestId !== latestRequest) return;

      chart.replaceChildren();
      status.textContent =
        `Trade exposure unavailable: ${error.message}`;

      console.error("Trade exposure error:", error);
    }
  }

  countrySelect.addEventListener("change", refreshTradeExposure);

  refreshTradeExposure();
})();
