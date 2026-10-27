
"""Test the workbook-backed nutrient API."""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "webapp"))

# Uses the environment variable already configured locally.
if not os.environ.get("FOOD_DEMAND_WORKBOOK_DIR"):
    raise RuntimeError(
        "Set FOOD_DEMAND_WORKBOOK_DIR before running this test"
    )

from app import app

client = app.test_client()

response = client.post(
    "/api/food-demand/nutrients",
    json={
        "country": "Nigeria",
        "scenario": "own",
        "shock": 0.10
    }
)

data = response.get_json()

print("Status:", response.status_code)
print("Response:", data)

assert response.status_code == 200

nutrients = data["nutrient_changes_percent"]

assert abs(nutrients["Energy"] - (-6.1143)) < 0.01
assert abs(nutrients["Protein"] - (-6.1171)) < 0.01
assert abs(nutrients["Fat"] - (-7.3997)) < 0.01
assert "Sugar" in data["missing_elasticity_groups"]

print("PASS: Nutrient Flask API")
