from lap_analyzer.models.session_summary import SessionSummary


def test_nested_laps_are_coerced():
    s = SessionSummary(
        id="a", filename="f", track="t", car="c", driver="d", track_length=1.0,
        best_lap=None, laps=[{"number": 1, "time": 90.0, "valid": True}],
    )  # fmt: skip
    assert s.laps[0].number == 1 and s.best_lap is None
