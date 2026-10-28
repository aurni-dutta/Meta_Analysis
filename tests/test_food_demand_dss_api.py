
"""Regression tests for the Food Demand DSS endpoints."""

import os
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "webapp"))

from app import app


@pytest.fixture
def client(monkeypatch):
    """Provide a Flask client with the local workbook directory."""
    workbook_dir = os.environ.get("FOOD_DEMAND_WORKBOOK_DIR")

    if not workbook_dir:
        pytest.skip(
            "Set FOOD_DEMAND_WORKBOOK_DIR to run workbook-based tests"
        )

    if not Path(workbook_dir).is_dir():
        pytest.skip("Workbook directory does not exist")

    monkeypatch.setenv("FOOD_DEMAND_WORKBOOK_DIR", workbook_dir)

    app.config["TESTING"] = True

    with app.test_client() as test_client:
        yield test_client


def post_country(client, endpoint, country="Nigeria"):
    """Request country-level workbook results."""
    return client.post(
        endpoint,
        json={"country": country},
    )


def test_nutrient_sources_nigeria_values(client):
    """Compare important nutrient shares with workbook values."""
    response = post_country(
        client, "/api/food-demand/nutrient-sources"
    )

    assert response.status_code == 200, response.get_json()

    contributions = response.get_json()["contributions"]

    energy = {
        row["food_group"]: row["percent"]
        for row in contributions["Energy"]
    }

    vitamin_a = {
        row["food_group"]: row["percent"]
        for row in contributions["Vitamin A"]
    }

    assert energy["Grains and vegetables"] == pytest.approx(
        68.987, abs=0.02
    )

    assert vitamin_a["Edible oil"] == pytest.approx(
        82.8931, abs=0.02
    )


@pytest.mark.parametrize("country", [
    "Nigeria",
    "Ghana",
    "South Africa",
])
def test_nutrient_shares_total_100(client, country):
    """Each nutrient's food-group shares should total 100%."""
    response = post_country(
        client,
        "/api/food-demand/nutrient-sources",
        country,
    )

    assert response.status_code == 200, response.get_json()

    contributions = response.get_json()["contributions"]

    for nutrient in (
        "Energy", "Protein", "Fat",
        "Iron", "Zinc", "Vitamin A"
    ):
        total = sum(
            row["percent"]
            for row in contributions[nutrient]
        )

        assert total == pytest.approx(
            100.0, abs=0.1
        ), f"{country}: {nutrient} totals {total}%"


def test_elasticity_evidence_nigeria(client):
    """Check workbook coefficients and missing estimates."""
    response = post_country(
        client, "/api/food-demand/elasticities"
    )

    assert response.status_code == 200, response.get_json()

    groups = {
        row["food_group"]: row
        for row in response.get_json()["food_groups"]
    }

    assert groups["Grains and vegetables"][
        "own_price_elasticity"
    ] == pytest.approx(-0.594)

    assert groups["Grains and vegetables"][
        "income_elasticity"
    ] == pytest.approx(1.079)

    assert groups["Sugar"]["own_price_elasticity"] is None
    assert groups["Sugar"]["income_elasticity"] is None


@pytest.mark.parametrize("endpoint", [
    "/api/food-demand/nutrient-sources",
    "/api/food-demand/elasticities",
])
def test_unsupported_country(client, endpoint):
    """Unsupported countries must return a clear client error."""
    response = post_country(
        client, endpoint, "Atlantis"
    )

    assert response.status_code == 400
    assert "error" in response.get_json()


@pytest.mark.parametrize("endpoint", [
    "/api/food-demand/nutrient-sources",
    "/api/food-demand/elasticities",
])
def test_missing_workbook_configuration(
    client, monkeypatch, endpoint
):
    """An unset workbook directory should be reported clearly."""
    monkeypatch.delenv(
        "FOOD_DEMAND_WORKBOOK_DIR",
        raising=False,
    )

    response = post_country(client, endpoint)

    assert response.status_code == 503
    assert "error" in response.get_json()
