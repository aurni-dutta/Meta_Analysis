
"""Regression tests for the workbook-backed trade exposure API."""

import os
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "webapp"))

from app import app


@pytest.fixture
def client(monkeypatch):
    """Create a Flask test client using the local country workbooks."""
    workbook_dir = os.environ.get("FOOD_DEMAND_WORKBOOK_DIR")

    if not workbook_dir or not Path(workbook_dir).is_dir():
        pytest.skip(
            "Set FOOD_DEMAND_WORKBOOK_DIR to a valid workbook folder"
        )

    monkeypatch.setenv("FOOD_DEMAND_WORKBOOK_DIR", workbook_dir)

    with app.test_client() as test_client:
        yield test_client


def request_trade_exposure(client, country):
    """Call the Trade Exposure endpoint."""
    return client.post(
        "/api/food-demand/trade-exposure",
        json={"country": country},
    )


def get_group_values(response):
    """Map food-group names to percentage values."""
    data = response.get_json()

    return {
        item["food_group"]: item["import_dependency_percent"]
        for item in data["food_groups"]
    }


def test_nigeria_trade_exposure_values(client):
    """Check known values from Nigeria's workbook."""
    response = request_trade_exposure(client, "Nigeria")

    assert response.status_code == 200, response.get_json()

    values = get_group_values(response)

    assert values["Grains and vegetables"] == pytest.approx(
        8.9798, abs=0.001
    )
    assert values["Meat and eggs"] == pytest.approx(
        0.6453, abs=0.001
    )
    assert values["Sugar"] == pytest.approx(
        95.8301, abs=0.001
    )
    assert values["Dairy"] == pytest.approx(
        59.3109, abs=0.001
    )


@pytest.mark.parametrize(
    ("country", "grains", "meat"),
    [
        ("Nigeria", 8.9798, 0.6453),
        ("Ghana", 11.2727, 42.3790),
        ("South Africa", 37.6779, 9.3387),
    ],
)
def test_country_import_dependency(client, country, grains, meat):
    """Verify two workbook indicators for every country."""
    response = request_trade_exposure(client, country)

    assert response.status_code == 200, response.get_json()

    values = get_group_values(response)

    assert values["Grains and vegetables"] == pytest.approx(
        grains, abs=0.001
    )
    assert values["Meat and eggs"] == pytest.approx(
        meat, abs=0.001
    )


@pytest.mark.parametrize(
    "country",
    ["Nigeria", "Ghana", "South Africa"],
)
def test_trade_exposure_structure(client, country):
    """Check all nine food groups and percentage ranges."""
    response = request_trade_exposure(client, country)

    assert response.status_code == 200, response.get_json()

    data = response.get_json()

    assert data["country"] == country
    assert data["unit"] == "percent"

    groups = data["food_groups"]

    assert len(groups) == 9
    assert len({item["food_group"] for item in groups}) == 9

    for item in groups:
        value = item["import_dependency_percent"]

        # Missing workbook values are allowed, but never
        # silently interpreted as zero.
        assert value is None or 0 <= value <= 100


def test_unsupported_country(client):
    """Reject unsupported country names."""
    response = request_trade_exposure(client, "Atlantis")

    assert response.status_code == 400
    assert "error" in response.get_json()


def test_missing_configuration(client, monkeypatch):
    """Return HTTP 503 when workbook directory is unset."""
    monkeypatch.delenv(
        "FOOD_DEMAND_WORKBOOK_DIR",
        raising=False,
    )

    response = request_trade_exposure(client, "Nigeria")

    assert response.status_code == 503
    assert "error" in response.get_json()


def test_missing_workbook_file(client, monkeypatch, tmp_path):
    """Return HTTP 503 when the requested workbook is missing."""
    monkeypatch.setenv(
        "FOOD_DEMAND_WORKBOOK_DIR",
        str(tmp_path),
    )

    response = request_trade_exposure(client, "Nigeria")

    assert response.status_code == 503
    assert "error" in response.get_json()
