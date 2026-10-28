
"use strict";

// Scenario shortcuts use the existing dashboard controls.
// No separate model calculations are introduced here.

document.querySelectorAll(".dss-preset").forEach(button => {
  button.addEventListener("click", () => {
    const country = button.dataset.presetCountry;
    const view = button.dataset.presetView;
    const shock = button.dataset.presetShock;

    const countrySelect = document.getElementById("country");
    const shockSlider = document.getElementById("shock");
    const scenarioButton =
      document.querySelector(`[data-view="${view}"]`);

    if (!countrySelect || !shockSlider || !scenarioButton) {
      console.error("Scenario preset: dashboard controls not found");
      return;
    }

    // Change the country and notify existing chart listeners.
    countrySelect.value = country;
    countrySelect.dispatchEvent(
      new Event("change", { bubbles: true })
    );

    // Activate the existing scenario tab.
    scenarioButton.click();

    // Change the shock and notify existing chart listeners.
    shockSlider.value = shock;
    shockSlider.dispatchEvent(
      new Event("input", { bubbles: true })
    );

    // Some existing listeners use "change" instead of "input".
    shockSlider.dispatchEvent(
      new Event("change", { bubbles: true })
    );
  });
});
