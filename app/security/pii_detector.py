import logging
import re

from app.config import get_settings
from app.schemas.schemas import Detection

logger = logging.getLogger(__name__)


class PIIDetector:
    def __init__(self, engine_mode: str | None = None) -> None:
        self.engine_mode = (engine_mode or get_settings().pii_engine).lower()
        self._presidio_analyzer = None
        if self.engine_mode in {"auto", "presidio"}:
            self._presidio_analyzer = self._init_presidio()
        self._patterns: list[tuple[str, re.Pattern[str], float]] = [
            ("EMAIL_ADDRESS", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"), 0.95),
            ("CREDIT_CARD", re.compile(r"\b(?:\d[ -]*?){13,19}\b"), 0.9),
            ("IP_ADDRESS", re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"), 0.8),
            ("PHONE_NUMBER", re.compile(r"(?<!\d)(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}(?!\d)"), 0.75),
        ]

    def detect(self, text: str) -> list[Detection]:
        if self.engine_mode == "presidio" and self._presidio_analyzer is None:
            logger.warning("PII_ENGINE=presidio requested, but Presidio is unavailable. Falling back to regex detector.")
        detections = self._detect_regex(text)
        if self._presidio_analyzer is not None:
            detections.extend(self._detect_presidio(text))
        return self._dedupe(sorted(detections, key=lambda item: (item.start or 0, item.end or 0)))

    def _detect_regex(self, text: str) -> list[Detection]:
        detections: list[Detection] = []
        for pii_type, pattern, confidence in self._patterns:
            for match in pattern.finditer(text):
                if pii_type == "CREDIT_CARD" and not self._looks_like_card(match.group()):
                    continue
                if pii_type == "IP_ADDRESS" and not self._looks_like_ip(match.group()):
                    continue
                detections.append(
                    Detection(
                        type=pii_type,
                        category="PII",
                        confidence=confidence,
                        start=match.start(),
                        end=match.end(),
                    )
                )
        return detections

    @staticmethod
    def suppress_overlaps(pii_detections: list[Detection], priority_detections: list[Detection]) -> list[Detection]:
        return [
            pii
            for pii in pii_detections
            if not any(_overlaps(pii, priority) for priority in priority_detections)
        ]

    @staticmethod
    def _init_presidio():
        try:
            from presidio_analyzer import AnalyzerEngine

            return AnalyzerEngine()
        except Exception as exc:
            if get_settings().pii_engine == "presidio":
                logger.warning("Could not initialize Microsoft Presidio: %s", exc)
            return None

    def _detect_presidio(self, text: str) -> list[Detection]:
        try:
            results = self._presidio_analyzer.analyze(text=text, language="en")
        except Exception as exc:
            logger.warning("Presidio analysis failed; using regex detections only: %s", exc)
            return []
        detections: list[Detection] = []
        for result in results:
            if result.entity_type not in {"EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD", "IP_ADDRESS", "PERSON", "LOCATION"}:
                continue
            detections.append(
                Detection(
                    type=result.entity_type,
                    category="PII",
                    confidence=float(result.score),
                    start=result.start,
                    end=result.end,
                )
            )
        return detections

    @staticmethod
    def _dedupe(detections: list[Detection]) -> list[Detection]:
        kept: list[Detection] = []
        for detection in detections:
            if any(_overlaps(detection, existing) and detection.type == existing.type for existing in kept):
                continue
            kept.append(detection)
        return kept

    @staticmethod
    def _looks_like_card(value: str) -> bool:
        digits = re.sub(r"\D", "", value)
        return 13 <= len(digits) <= 19 and PIIDetector._luhn_valid(digits)

    @staticmethod
    def _luhn_valid(digits: str) -> bool:
        total = 0
        reverse_digits = digits[::-1]
        for index, char in enumerate(reverse_digits):
            number = int(char)
            if index % 2 == 1:
                number *= 2
                if number > 9:
                    number -= 9
            total += number
        return total % 10 == 0

    @staticmethod
    def _looks_like_ip(value: str) -> bool:
        return all(0 <= int(part) <= 255 for part in value.split("."))


def _overlaps(left: Detection, right: Detection) -> bool:
    if left.start is None or left.end is None or right.start is None or right.end is None:
        return False
    return left.start < right.end and right.start < left.end
