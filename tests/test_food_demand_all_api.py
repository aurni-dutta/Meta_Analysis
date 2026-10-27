
"""Test the food-demand Flask endpoint."""

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "webapp"))

os.environ["FOOD_DEMAND_WORKBOOK_DIR"] = (
    r"C:\Users\aurni\Documents\Work\Workbooks"
)

from app import app


def test_nigeria_own_price_simulation():
    """Check Nigeria's 10% own-price scenario."""

    client = app.test_client()

    response = client.post(
        "/api/food-demand/simulate",
        json={
            "country": "Nigeria",
            "scenario": "own",
            "food_group": "Grains and vegetables",
            "shock": 0.10,
        },
    )

    assert response.status_code == 200, (
        f"API returned {response.status_code}: "
        f"{response.get_json()}"
    )

    result = response.get_json()

    assert abs(
        result["predicted_g_day"] - 1225.64
    ) < 0.02
