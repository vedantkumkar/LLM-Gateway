import re

from app.schemas.schemas import Detection


class SecretDetector:
    def __init__(self) -> None:
        self._patterns: list[tuple[str, re.Pattern[str], float]] = [
            ("PRIVATE_KEY", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----"), 0.99),
            ("AUTHORIZATION_BEARER", re.compile(r"Authorization:\s*Bearer\s+[A-Za-z0-9._~+/=-]{10,}", re.IGNORECASE), 0.95),
            ("JWT_TOKEN", re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"), 0.95),
            ("AWS_ACCESS_KEY", re.compile(r"\bA[KS]IA[0-9A-Z]{16}\b"), 0.95),
            ("OPENAI_STYLE_KEY", re.compile(r"\bsk-[A-Za-z0-9][A-Za-z0-9_-]{10,}[A-Za-z0-9]\b"), 0.92),
            ("PASSWORD_ASSIGNMENT", re.compile(r"\b(password|passwd|pwd)\s*[:=]\s*['\"]?[^'\"\s]{6,}", re.IGNORECASE), 0.9),
            ("API_KEY_ASSIGNMENT", re.compile(r"\b(api[_-]?key|secret|token)\s*[:=]\s*['\"]?[A-Za-z0-9._~+/=-]{10,}", re.IGNORECASE), 0.88),
        ]

    def detect(self, text: str) -> list[Detection]:
        detections: list[Detection] = []
        for secret_type, pattern, confidence in self._patterns:
            for match in pattern.finditer(text):
                detections.append(
                    Detection(
                        type=secret_type,
                        category="SECRET",
                        confidence=confidence,
                        start=match.start(),
                        end=match.end(),
                    )
                )
        return self._dedupe(sorted(detections, key=lambda item: (item.start or 0, item.end or 0)))

    @staticmethod
    def _dedupe(detections: list[Detection]) -> list[Detection]:
        kept: list[Detection] = []
        for detection in detections:
            if any(_same_span(detection, existing) for existing in kept):
                continue
            kept.append(detection)
        return kept


def _same_span(left: Detection, right: Detection) -> bool:
    return left.start == right.start and left.end == right.end and left.type == right.type
