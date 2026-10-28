
# Food Demand Dashboard — Local Setup

## Overview

The Food Demand dashboard is part of the MetaExtract Flask
application. It uses country-specific Excel workbooks to
simulate changes in food supply and nutrient availability.

## Supported countries

- Nigeria
- Ghana
- South Africa

## Supported scenarios

- Own-price changes
- Income / food-expenditure changes

Cross-price and Tariff scenarios are under development.

## Workbook requirements

The application expects these files:

- NIGERIA_FOOD_RESULTS.xlsx
- GHANA_FOOD_RESULTS.xlsx
- SOUTH_AFRICA_FOOD_RESULTS.xlsx

The workbooks are stored outside the Git repository.

Set the FOOD_DEMAND_WORKBOOK_DIR environment variable to
the directory containing these files.

## Run locally (Windows PowerShell)

From the project root:

```powershell
$env:FOOD_DEMAND_WORKBOOK_DIR = "C:\path\to\Workbooks"

.\.venv\Scripts\python.exe -m flask --app webapp/app.py run --port 5052
```

Then open:

http://127.0.0.1:5052/food-demand

The Python virtual environment must already be configured
with the application's dependencies.

## Run automated tests

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Workbook-backed integration tests require
FOOD_DEMAND_WORKBOOK_DIR to point to the country workbooks.

## Current dashboard features

- Baseline versus predicted food supply
- Six-nutrient impact chart
- Nutrient response curve
- Food-group nutrient contribution chart
- Scenario shortcuts
- Scenario results summary
- Elasticity evidence table
- Side-by-side nutrient scenario comparison
- CSV export
- Data sources and model assumptions panel

## Trade exposure data provenance

The Trade Exposure chart reads the
"Import dependency (kcal-weighted)" field from
column L of the "TABLE 2 CONSUMPTION" worksheet.

Each supported country's worksheet title identifies
its underlying food-balance data as 2023:

- Nigeria — 2023 (FAO Food Balance Sheet)
- Ghana — 2023 (FAO Food Balance Sheet)
- South Africa — 2023 (FAO Food Balance Sheet)

The API converts workbook fractions (0–1) to percentages
(0–100) for display.

Import dependency is a descriptive exposure indicator.
It is not a simulated tariff impact, trade-flow forecast,
or estimate of household food consumption.


## Important modeling notes

The current own-price scenario applies the specified
percentage price change separately to each food group's
own price. It is not a single-food-group price shock with
cross-price substitution.

Nutrient impacts represent modeled changes in national
food supply, not measured individual dietary intake.

Missing elasticities must not be interpreted as zero.

The dashboard is a research prototype and has not yet
been validated for production policy use.

## Remaining work

- Single-food-group shock simulation
- Cross-price and Tariff modeling
- Recommended nutrient reference comparisons
- Additional validation and model documentation
- Deployment and shared workbook access
```
