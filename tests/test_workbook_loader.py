
"""Test loading Andrew's Nigeria workbook."""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "webapp"))

from food_demand import load_food_group_data, predict_quantity


WORKBOOK = Path(
    r"C:\Users\aurni\Documents\Work\Workbooks\NIGERIA_FOOD_RESULTS.xlsx"
)

data = load_food_group_data(
    WORKBOOK,
    "Grains and vegetables"
)

print("Data loaded from Excel:")
print(data)

predicted = predict_quantity(
    baseline=data["baseline_g_day"],
    elasticity=data["own_price_elasticity"],
    shock=0.10
)

print(f"\nBaseline: {data['baseline_g_day']:.2f} g/day")
print(f"Predicted: {predicted:.2f} g/day")
print(
    "Quantity change:",
    f"{data['own_price_elasticity'] * 10:.2f}%"
)

assert abs(predicted - 1225.64) < 0.02
print("\nPASS: Workbook-based calculation")
