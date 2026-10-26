
"""Tests for food-demand calculations."""

import sys
from pathlib import Path

# Allow the test to import the application module.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "webapp"))

from food_demand import predict_quantity


def test_nigeria_own_price():
    """Check Andrew's documented Nigeria example."""
    baseline = 1303
    elasticity = -0.594
    price_change = 0.10

    result = predict_quantity(baseline, elasticity, price_change)

    assert abs(result - 1225.6018) < 0.01

    print("PASS: Nigeria own-price calculation")
    print(f"Predicted supply: {result:.2f} g/day")


if __name__ == "__main__":
    test_nigeria_own_price()
