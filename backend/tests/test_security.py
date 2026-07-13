"""Testes para security (JWT)."""

from services.security import create_access_token, verify_access_token


class TestJWT:
    def test_create_and_verify(self):
        data = {"sub": "admin", "role": "admin"}
        token = create_access_token(data)
        assert isinstance(token, str)
        payload = verify_access_token(token)
        assert payload is not None
        assert payload["sub"] == "admin"
        assert payload["role"] == "admin"

    def test_invalid_token_returns_none(self):
        result = verify_access_token("invalid.token.here")
        assert result is None

    def test_token_has_expiry(self):
        token = create_access_token({"sub": "test"})
        payload = verify_access_token(token)
        assert "exp" in payload
