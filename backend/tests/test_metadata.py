from lap_analyzer.metadata import describe


def test_describe_reads_everything():
    meta = describe(
        {
            "WeekendInfo": {
                "TrackDisplayName": "Spa",
                "EventType": "Race",
                "SubSessionID": 123,
            },
            "DriverInfo": {
                "DriverCarIdx": 3,
                "Drivers": [
                    {"CarIdx": 0, "UserName": "Other", "CarScreenName": "Other car"},
                    {"CarIdx": 3, "UserName": "Me", "CarScreenName": "BMW M4 GT3"},
                ],
            },
        }
    )
    assert (meta.track, meta.car, meta.driver) == ("Spa", "BMW M4 GT3", "Me")
    assert (meta.session_type, meta.sub_session_id) == ("Race", 123)


def test_describe_falls_back_when_fields_are_missing():
    meta = describe({"WeekendInfo": None, "DriverInfo": {"Drivers": None}})
    assert (meta.track, meta.car, meta.driver) == ("Unknown track", "Unknown car", "Unknown driver")
    assert meta.session_type is None
    assert meta.sub_session_id is None


def test_describe_uses_track_name_and_ignores_bad_sub_session():
    meta = describe({"WeekendInfo": {"TrackName": "monza", "SubSessionID": 0}})
    assert meta.track == "monza"
    assert meta.sub_session_id is None
