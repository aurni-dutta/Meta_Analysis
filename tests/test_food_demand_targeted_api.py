
"""Tests for targeted single-food-group price shocks."""

import os
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "webapp"))

from app import app

ENDPOINT = "/api/food-demand/targeted-price"


@pytest.fixture
def client():
    """Use the existing Flask application."""
    with app.test_client() as test_client:
        yield test_client


@pytest.fixture
def workbooks():
    """Skip workbook-based tests if local data are unavailable."""
    directory = os.environ.get("FOOD_DEMAND_WORKBOOK_DIR")

    if not directory or not Path(directory).is_dir():
        pytest.skip("Country workbooks are not configured")

    return directory


def post_shock(client, **overrides):
    data = {
        "country": "Nigeria",
        "food_group": "Grains and vegetables",
        "shock": 0.10,
    }
    data.update(overrides)
    return client.post(ENDPOINT, json=data)


def test_nigeria_targeted_price_calculation(client, workbooks):
    """Check the known Nigeria +10% grains scenario."""
    response = post_shock(client)

    assert response.status_code == 200, response.get_json()

    result = response.get_json()

    assert result["scenario"] == "targeted_own_price"
    assert result["cross_price_effects_included"] is False

    assert result["own_price_elasticity"] == pytest.approx(-0.594)
    assert result["baseline_g_day"] == pytest.approx(1303.0411)
    assert result["predicted_g_day"] == pytest.approx(1225.6405)
    assert result["quantity_change_percent"] == pytest.approx(-5.94)

    assert result["nutrient_changes_percent"]["Energy"] == pytest.approx(
        -4.0978, abs=0.0001
    )


def test_all_six_nutrients(client, workbooks):
    """Check the complete known Nigeria nutrient response."""
    response = post_shock(client)
    assert response.status_code == 200

    changes = response.get_json()["nutrient_changes_percent"]

    expected = {
        "Energy": -4.0978,
        "Protein": -4.3193,
        "Fat": -0.8173,
        "Iron": -4.9483,
        "Zinc": -4.7339,
        "Vitamin A": -0.4157,
    }

    assert set(changes) == set(expected)

    for nutrient, value in expected.items():
        assert changes[nutrient] == pytest.approx(value, abs=0.0001)


@pytest.mark.parametrize("country", [
    "Nigeria",
    "Ghana",
    "South Africa",
])
def test_supported_countries(client, workbooks, country):
    """Each country can run a targeted grains price shock."""
    response = post_shock(client, country=country)

    assert response.status_code == 200, response.get_json()

    result = response.get_json()
    assert result["country"] == country
    assert result["food_group"] == "Grains and vegetables"
    assert len(result["nutrient_changes_percent"]) == 6


def test_missing_elasticity(client, workbooks):
    """Sugar has no Nigeria own-price coefficient."""
    response = post_shock(client, food_group="Sugar")

    assert response.status_code == 400
    assert "elasticity" in response.get_json()["error"].lower()


def test_unsupported_country(client):
    response = post_shock(client, country="Atlantis")

    assert response.status_code == 400
    assert "error" in response.get_json()


@pytest.mark.parametrize("shock", [
    0.50,
    -0.50,
    True,
])
def test_invalid_shock(client, workbooks, shock):
    response = post_shock(client, shock=shock)

    assert response.status_code == 400
    assert "error" in response.get_json()


def test_missing_configuration(client, monkeypatch):
    monkeypatch.delenv("FOOD_DEMAND_WORKBOOK_DIR", raising=False)

    response = post_shock(client)

    assert response.status_code == 503
    assert "error" in response.get_json()


def test_missing_workbook(client, monkeypatch, tmp_path):
    monkeypatch.setenv("FOOD_DEMAND_WORKBOOK_DIR", str(tmp_path))

    response = post_shock(client)

    assert response.status_code == 503
    assert "error" in response.get_json()
