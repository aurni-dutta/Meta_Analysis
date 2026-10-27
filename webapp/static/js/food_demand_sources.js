
"use strict";

// Figure V3-style baseline nutrient contribution chart.

const sourceColors = {
  "Grains and vegetables": "#4D7ACB",
  "Meat and eggs": "#D77A42",
  "Edible oil": "#5CA980",
  "Aquatic products": "#E1A32F",
  "Fruits": "#CC7D9E",
  "Dairy": "#328A43",
  "Sugar": "#8061C8",
  "Alcohol": "#9B8CBE",
  "Ungrouped / other": "#B3A6CE"
};

const sourceNutrients = [
  "Energy", "Protein", "Fat",
  "Iron", "Zinc", "Vitamin A"
];

let sourceRequestId = 0;

async function refreshNutrientSources() {
  const id = ++sourceRequestId;
  const country = document.getElementById("country").value;
  const chart = document.getElementById("nutrientSourcesChart");
  const legend = document.getElementById("nutrientSourcesLegend");
  const status = document.getElementById("nutrientSourcesStatus");

  chart.replaceChildren();
  legend.replaceChildren();
  status.textContent = "Loading nutrient contributions...";

  try {
    const response = await fetch(
      "/api/food-demand/nutrient-sources",
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

    if (id !== sourceRequestId) return;

    const contributions = data.contributions;

    sourceNutrients.forEach(nutrient => {
      const row = document.createElement("div");
      row.className = "sources-row";

      const label = document.createElement("strong");
      label.textContent = nutrient;

      const track = document.createElement("div");
      track.className = "sources-track";

      (contributions[nutrient] || []).forEach(item => {
        if (item.percent <= 0) return;

        const segment = document.createElement("div");
        segment.className = "sources-segment";
        segment.style.width = `${item.percent}%`;
        segment.style.backgroundColor =
          sourceColors[item.food_group] || "#A1A1AA";

        segment.title =
          `${nutrient} · ${item.food_group}: ` +
          `${item.percent.toFixed(1)}%`;

        track.append(segment);
      });

      row.append(label, track);
      chart.append(row);
    });

    // Create the legend from the actual workbook groups.
    const groups = contributions["Energy"] || [];

    groups.forEach(item => {
      const entry = document.createElement("span");
      entry.className = "sources-key";

      const swatch = document.createElement("i");
      swatch.className = "sources-swatch";
      swatch.style.backgroundColor =
        sourceColors[item.food_group] || "#A1A1AA";

      const text = document.createElement("span");
      text.textContent = item.food_group;

      entry.append(swatch, text);
      legend.append(entry);
    });

    status.textContent =
      `${country} · FAO 2023 baseline nutrient contributions`;

  } catch (error) {
    if (id !== sourceRequestId) return;

    chart.replaceChildren();
    legend.replaceChildren();
    status.textContent =
      `Data unavailable: ${error.message}`;

    console.error("Nutrient contribution error:", error);
  }
}

document.getElementById("country").addEventListener(
  "change",
  refreshNutrientSources
);

refreshNutrientSources();
