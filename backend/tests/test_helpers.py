"""Testes para helpers (password hashing, formatação, etc.)."""

from utils.helpers import (
    hash_password,
    verify_password,
    format_date_br,
    format_time_br,
    format_file_size,
    mask_sensitive,
    sanitize_filename,
    truncate_text,
)
from datetime import date, time


class TestPasswordHashing:
    def test_hash_and_verify(self):
        pw = "minha_senha_segura_123"
        hashed = hash_password(pw)
        assert hashed != pw
        assert verify_password(pw, hashed)

    def test_wrong_password_fails(self):
        hashed = hash_password("senha_correta")
        assert not verify_password("senha_errada", hashed)

    def test_bcrypt_hashes_are_different(self):
        h1 = hash_password("test")
        h2 = hash_password("test")
        assert h1 != h2

    def test_verify_sha256_legacy(self):
        import hashlib
        pw = "legacy_pass"
        sha256_hash = hashlib.sha256(pw.encode("utf-8")).hexdigest()
        assert verify_password(pw, sha256_hash)


class TestDateFormat:
    def test_format_date_br(self):
        assert format_date_br(date(2024, 3, 15)) == "15/03/2024"

    def test_format_date_br_none(self):
        assert format_date_br(None) == "-"

    def test_format_date_br_string(self):
        assert format_date_br("2024-01-01") == "01/01/2024"


class TestTimeFormat:
    def test_format_time_br(self):
        assert format_time_br(time(14, 30)) == "14:30"

    def test_format_time_br_none(self):
        assert format_time_br(None) == "-"


class TestFileSize:
    def test_bytes(self):
        assert format_file_size(512) == "512 B"

    def test_kb(self):
        assert "KB" in format_file_size(2048)

    def test_mb(self):
        assert "MB" in format_file_size(5 * 1024 * 1024)


class TestMaskSensitive:
    def test_mask(self):
        result = mask_sensitive("12345678901", 4)
        assert result.startswith("1234")
        assert "*" in result


class TestSanitizeFilename:
    def test_clean(self):
        assert sanitize_filename("file name (1).pdf") == "file_name__1_.pdf"

    def test_long_name_truncated(self):
        long_name = "a" * 300 + ".pdf"
        assert len(sanitize_filename(long_name)) <= 255


class TestTruncateText:
    def test_short_text_unchanged(self):
        assert truncate_text("short", 10) == "short"

    def test_long_text_truncated(self):
        result = truncate_text("a" * 100, 50)
        assert len(result) <= 53
        assert result.endswith("...")
