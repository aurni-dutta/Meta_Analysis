
"use strict";

(() => {
  const chart = document.getElementById("energyChart");
  const legend = document.getElementById("energyLegend");
  const selector = document.getElementById("highlightFoodGroup");
  const status = document.getElementById("energyStatus");

  const palette = [
    "#5268D9", "#7BA5E6", "#E6AE66",
    "#55AD9F", "#9B84CD", "#E28E9B",
    "#86B763", "#B9A27A", "#93A5B5"
  ];

  const formatNumber = number =>
    Number(number).toLocaleString("en-CA", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });

  let countries = [];
  let groupColors = new Map();

  function applyHighlight() {
    const selected = selector.value;

    document.querySelectorAll(".energy-segment").forEach(segment => {
      const highlight =
        selected === "all" || segment.dataset.group === selected;

      segment.classList.toggle("dimmed", !highlight);
    });

    document.querySelectorAll(".legend-item").forEach(item => {
      item.classList.toggle(
        "dimmed",
        selected !== "all" && item.dataset.group !== selected
      );
    });
  }

  function drawChart() {
    chart.replaceChildren();
    legend.replaceChildren();

    const maxTotal = Math.max(...countries.map(
      country => country.total_kcal_day
    ));

    const groups = countries[0].food_groups.map(
      item => item.food_group
    );

    groupColors = new Map(groups.map(
      (group, index) => [group, palette[index % palette.length]]
    ));

    // Populate the filter without duplicating options.
    selector.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All food groups";
    selector.append(allOption);

    groups.forEach(group => {
      const option = document.createElement("option");
      option.value = group;
      option.textContent = group;
      selector.append(option);

      const legendItem = document.createElement("div");
      legendItem.className = "legend-item";
      legendItem.dataset.group = group;

      const swatch = document.createElement("span");
      swatch.className = "legend-swatch";
      swatch.style.backgroundColor = groupColors.get(group);

      const label = document.createElement("span");
      label.textContent = group;

      legendItem.append(swatch, label);
      legend.append(legendItem);
    });

    countries.forEach(country => {
      const column = document.createElement("div");
      column.className = "energy-country";

      const total = document.createElement("div");
      total.className = "country-total";
      total.textContent = formatNumber(country.total_kcal_day);

      const plot = document.createElement("div");
      plot.className = "country-plot";

      const bar = document.createElement("div");
      bar.className = "energy-bar";

      // Bars are scaled to the largest national energy total.
      bar.style.height =
        `${country.total_kcal_day / maxTotal * 100}%`;

      country.food_groups.forEach(item => {
        const segment = document.createElement("div");
        segment.className = "energy-segment";
        segment.dataset.group = item.food_group;

        segment.style.backgroundColor =
          groupColors.get(item.food_group);

        segment.style.height =
          `${item.energy_kcal_day / country.total_kcal_day * 100}%`;

        const detail =
          `${country.country} — ${item.food_group}\n` +
          `${formatNumber(item.energy_kcal_day)} kcal/person/day\n` +
          `${item.share_percent.toFixed(2)}% of national energy`;

        segment.title = detail;
        segment.setAttribute("role", "img");
        segment.setAttribute("aria-label", detail.replaceAll("\n", ", "));

        bar.append(segment);
      });

      plot.append(bar);

      const name = document.createElement("div");
      name.className = "country-name";
      name.textContent = country.country;

      column.append(total, plot, name);
      chart.append(column);
    });

    applyHighlight();
  }

  async function initialize() {
    try {
      const response = await fetch(
        "/api/food-demand/energy-availability"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (!Array.isArray(data.countries) || !data.countries.length) {
        throw new Error("No country data available");
      }

      countries = data.countries;
      drawChart();

      status.textContent =
        "Hover over a colored segment to see its contribution. " +
        "Use the dropdown to highlight a food group.";

    } catch (error) {
      status.textContent =
        `Energy availability unavailable: ${error.message}`;
      console.error(error);
    }
  }

  selector.addEventListener("change", applyHighlight);
  initialize();
})();
