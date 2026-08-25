from app.security.pii_detector import PIIDetector
from app.security.redactor import Redactor
from app.security.secret_detector import SecretDetector


class ResponseFilter:
    def __init__(self) -> None:
        self.pii_detector = PIIDetector()
        self.secret_detector = SecretDetector()
        self.redactor = Redactor()

    def filter(self, response: str) -> tuple[str, str]:
        secrets = self.secret_detector.detect(response)
        pii = self.pii_detector.suppress_overlaps(self.pii_detector.detect(response), secrets)
        detections = pii + secrets
        if not detections:
            return response, "SAFE"
        if any(item.category == "SECRET" for item in detections):
            return "The provider response was blocked because it appeared to contain sensitive secret material.", "BLOCKED"
        return self.redactor.redact(response, detections), "REDACTED"
