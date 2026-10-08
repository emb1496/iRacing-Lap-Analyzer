from lap_analyzer.models.conditions_out import ConditionsOut, TyreOut


def test_everything_optional_by_default():
    c = ConditionsOut()
    assert c.track_temp is None and c.tyres == {}


def test_tyre_pressure_optional():
    t = TyreOut(inner=1, middle=2, outer=3)
    assert t.pressure is None
    assert ConditionsOut(tyres={"LF": t}).tyres["LF"].middle == 2
