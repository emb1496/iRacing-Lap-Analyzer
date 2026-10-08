from lap_analyzer.models.comparison_out import ComparisonOut


def test_fields_nest_the_other_models():
    assert {"ref", "cmp", "ref_trace", "corners", "ref_conditions"} <= set(
        ComparisonOut.model_fields
    )
