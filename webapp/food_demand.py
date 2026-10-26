from pathlib import Path
from openpyxl import load_workbook

"""Food-demand scenario calculations."""

def predict_quantity(baseline, elasticity, shock):
    """
    Estimate quantity after a price or food-spending shock.

    Args:
        baseline: Starting food supply quantity.
        elasticity: Relevant price or spending elasticity.
        shock: Fractional change, e.g. 0.10 for +10%.

    Returns:
        Predicted quantity in the same units as baseline.
    """
    return baseline * (1 + elasticity * shock)


from pathlib import Path
from openpyxl import load_workbook



def load_food_group_data(workbook_path, food_group):
    """
    Read baseline food supply and elasticities from Andrew's workbook.
    """
    workbook_path = Path(workbook_path)

    workbook = load_workbook(
        workbook_path,
        read_only=True,
        data_only=True
    )

    try:
        elasticity_sheet = workbook["TABLE 1 ELASTICITY"]
        consumption_sheet = workbook["TABLE 2 CONSUMPTION"]

        own_price = None
        income = None
        baseline = None

        # Find the requested food group in the elasticity table.
        for row in elasticity_sheet.iter_rows(
            min_row=5,
            values_only=True
        ):
            if row[0] == food_group:
                income = row[11]       # Column L
                own_price = row[12]    # Column M
                break

        # Find the baseline food supply in the consumption table.
        for row in consumption_sheet.iter_rows(
            min_row=3,
            values_only=True
        ):
            if row[0] == food_group:
                baseline = row[2]      # Column C, g/person/day
                break

        if not isinstance(baseline, (int, float)):
            raise ValueError(
                f"Baseline unavailable: {food_group}"
            )

        # Missing estimates are represented by None, not zero.
        if not isinstance(own_price, (int, float)):
            own_price = None

        if not isinstance(income, (int, float)):
            income = None

        return {
            "food_group": food_group,
            "baseline_g_day": baseline,
            "own_price_elasticity": own_price,
            "income_elasticity": income
        }

    finally:
        workbook.close()
