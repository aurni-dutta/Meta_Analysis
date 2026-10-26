
"""Test the all-food-groups Flask endpoint."""

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "webapp"))

os.environ["FOOD_DEMAND_WORKBOOK_DIR"] = (
    r"C:\Users\aurni\Documents\Work\Workbooks"
)

from app import app

client = app.test_client()

response = client.post(
    "/api/food-demand/simulate-all",
    json={
        "country": "Nigeria",
        "scenario": "own",
        "shock": 0.10,
    },
)

print("Status:", response.status_code)

data = response.get_json()

if response.status_code != 200:
    print("Error:", data)

assert response.status_code == 200
assert len(data["food_groups"]) == 9

for food in data["food_groups"]:
    print(
        food["food_group"],
        "| Baseline:", food["baseline_g_day"],
        "| Predicted:", food["predicted_g_day"],
    )

grains = next(
    food for food in data["food_groups"]
    if food["food_group"] == "Grains and vegetables"
)

assert abs(grains["predicted_g_day"] - 1225.64) < 0.02

sugar = next(
    food for food in data["food_groups"]
    if food["food_group"] == "Sugar"
)

assert sugar["predicted_g_day"] is None

print("\nPASS: All-food-groups API")
