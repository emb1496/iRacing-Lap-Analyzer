from lap_analyzer.models.lap_summary import LapSummary


def test_time_may_be_none():
    assert LapSummary(number=1, time=None, valid=False).time is None
