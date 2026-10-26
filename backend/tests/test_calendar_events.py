# Calendar events proxy API tests
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL").rstrip("/")
EP = f"{BASE_URL}/api/calendar-events"


class TestCalendarEvents:
    def test_october_2026_proxy(self):
        r = requests.get(EP, params={"year": 2026, "month": 10}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert set(d.keys()) == {"year", "month", "totalEvents", "days"}
        assert d["year"] == 2026 and d["month"] == 10
        assert isinstance(d["days"], dict)
        assert "2026-10-02" in d["days"] and "2026-10-05" in d["days"]
        assert len(d["days"]["2026-10-05"]) == 2
        ev = d["days"]["2026-10-05"][0]
        for k in ("title", "type", "startAt"):
            assert k in ev
        assert d["totalEvents"] == sum(len(v) for v in d["days"].values())

    @pytest.mark.parametrize("params", [
        {"year": 2026, "month": 13}, {"year": 2026, "month": 0},
        {"year": 2026}, {"month": 5}, {"year": "abc", "month": 1}, {"year": 1800, "month": 1},
    ])
    def test_validation_422(self, params):
        r = requests.get(EP, params=params, timeout=20)
        assert r.status_code == 422

    def test_other_month_ok(self):
        r = requests.get(EP, params={"year": 2026, "month": 1}, timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json()["days"], dict)
