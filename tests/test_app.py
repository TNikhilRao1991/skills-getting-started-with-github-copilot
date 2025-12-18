from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


def test_root_redirects_to_static():
    resp = client.get("/")
    assert resp.status_code == 200
    # static index should contain expected title
    assert "Mergington High School" in resp.text


def test_get_activities_returns_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # ensure a known activity exists
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "test.user@example.com"

    # ensure email not already present
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # signup
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert email in activities[activity]["participants"]

    # duplicate signup should return 400
    resp2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp2.status_code == 400

    # unregister
    resp3 = client.post(f"/activities/{activity}/unregister?email={email}")
    assert resp3.status_code == 200
    assert email not in activities[activity]["participants"]

    # unregistering again should 400
    resp4 = client.post(f"/activities/{activity}/unregister?email={email}")
    assert resp4.status_code == 400
