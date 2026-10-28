
"use strict";

(() => {
  const byId = id => document.getElementById(id);

  const chart = byId("importsChart");
  const status = byId("importsStatus");
  const groupSelect = byId("importsFoodGroup");

  const countries = [
    { name: "Nigeria", input: "tariffNigeria" },
    { name: "Ghana", input: "tariffGhana" },
    { name: "South Africa", input: "tariffSouthAfrica" }
  ];

  if (!chart || !status || !groupSelect ||
      countries.some(c => !byId(c.input))) {
    return;
  }

  const exposureData = new Map();

  async function loadCountry(country) {
    const response = await fetch("/api/food-demand/trade-exposure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`${country}: ${data.error || response.status}`);
    }

    return data.food_groups;
  }

  function makeElement(tag, className, text = "") {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function draw() {
    chart.replaceChildren();

    const selectedGroup = groupSelect.value;

    const enteredTariffs = countries.map(country => {
      const raw = byId(country.input).value.trim();
      const value = Number(raw);
      return {
        ...country,
        tariff: raw !== "" && Number.isFinite(value) &&
                value >= 0 && value <= 100 ? value : null
      };
    });

    const anyInvalid = enteredTariffs.some(c => c.tariff === null);

    if (anyInvalid) {
      status.textContent =
        "Enter a tariff rate from 0% to 100% for each country.";
      return;
    }

    const dataAvailable = countries.every(c =>
      exposureData.has(c.name)
    );

    if (!dataAvailable) return;

    for (const country of enteredTariffs) {
      const groups = exposureData.get(country.name);
      const item = groups.find(g => g.food_group === selectedGroup);

      const exposure = item?.import_dependency_percent;
      const validExposure =
        typeof exposure === "number" && Number.isFinite(exposure);

      const column = makeElement("div", "imports-country");

      const upper = makeElement("div", "imports-upper");
      const exposureValue = makeElement(
        "strong",
        "imports-value",
        validExposure ? `${exposure.toFixed(1)}%` : "Unavailable"
      );

      const exposureBar = makeElement(
        "div", "imports-bar imports-exposure-bar"
      );

      exposureBar.style.height =
        `${validExposure ? Math.min(100, Math.max(0, exposure)) : 0}%`;

        upper.style.setProperty(
        "--bar-height",
        `${validExposure ? Math.min(100, Math.max(0, exposure)) : 0}%`
        );

      exposureBar.title = validExposure
        ? `${country.name}: ${exposure.toFixed(2)}% import dependency`
        : `${country.name}: import dependency unavailable`;

      upper.append(exposureBar, exposureValue);

      const baseline = makeElement("div", "imports-zero-line");

      const lower = makeElement("div", "imports-lower");
      const tariffBar = makeElement(
        "div", "imports-bar imports-tariff-bar"
      );

      tariffBar.style.height = `${country.tariff}%`;
      lower.style.setProperty(
        "--bar-height",
        `${country.tariff}%`
        );
      tariffBar.title =
        `${country.name}: hypothetical ${country.tariff}% tariff`;

      const tariffValue = makeElement(
        "strong", "imports-value",
        `${country.tariff.toFixed(1)}%`
      );

      lower.append(tariffBar, tariffValue);

      const name = makeElement(
        "div", "imports-country-name", country.name
      );

      column.append(upper, baseline, lower, name);
      chart.append(column);
    }

    status.textContent =
      `${selectedGroup} · Workbook import dependency versus hypothetical tariffs`;
  }

  async function initialize() {
    try {
      const results = await Promise.all(
        countries.map(c => loadCountry(c.name))
      );

      countries.forEach((country, index) => {
        exposureData.set(country.name, results[index]);
      });

      draw();
    } catch (error) {
      chart.replaceChildren();
      status.textContent = `Unable to load import data: ${error.message}`;
      console.error("Imports showcase:", error);
    }
  }

  groupSelect.addEventListener("change", draw);

  countries.forEach(country => {
    byId(country.input).addEventListener("input", draw);
  });

  initialize();
})();
