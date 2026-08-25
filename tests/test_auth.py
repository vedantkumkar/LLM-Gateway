def test_unauthorized_chat_request(client):
    response = client.post("/api/v1/chat", json={"message": "Hello", "model": "internal-secure-llm"})

    assert response.status_code == 401

