def test_email_gets_detected_and_redacted(client, auth_headers):
    response = client.post(
        "/api/v1/analyze",
        headers=auth_headers,
        json={
            "message": "My name is Rahul Sharma and my email is rahul.sharma@example.com. Explain cloud security.",
            "model": "internal-secure-llm",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["decision"] == "REDACT_AND_ALLOW"
    assert any(item["type"] == "EMAIL_ADDRESS" for item in body["detections"])
    assert "rahul.sharma@example.com" not in body["sanitized_prompt"]
    assert "<EMAIL_ADDRESS>" in body["sanitized_prompt"]


def test_credit_card_detected_and_redacted(client, auth_headers):
    response = client.post(
        "/api/v1/analyze",
        headers=auth_headers,
        json={"message": "My credit card number is 4111111111111111. Explain payment security.", "model": "internal-secure-llm"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["decision"] == "REDACT_AND_ALLOW"
    assert any(item["type"] == "CREDIT_CARD" for item in body["detections"])
    assert "4111111111111111" not in body["sanitized_prompt"]


def test_api_key_does_not_create_overlapping_phone_detection(client, auth_headers):
    response = client.post(
        "/api/v1/analyze",
        headers=auth_headers,
        json={"message": "My API key is sk-demo-1234567890abcdef. Help me debug it.", "model": "internal-secure-llm"},
    )

    assert response.status_code == 200
    detection_types = [item["type"] for item in response.json()["detections"]]
    assert "OPENAI_STYLE_KEY" in detection_types
    assert "PHONE_NUMBER" not in detection_types


def test_real_phone_number_still_gets_detected(client, auth_headers):
    response = client.post(
        "/api/v1/analyze",
        headers=auth_headers,
        json={"message": "Please call me at 9876543210 about cloud security.", "model": "internal-secure-llm"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["decision"] == "REDACT_AND_ALLOW"
    assert any(item["type"] == "PHONE_NUMBER" for item in body["detections"])
    assert "<PHONE_NUMBER>" in body["sanitized_prompt"]

