"""
Lighting Monitor
Detects suspicious ambient brightness changes:
  - sudden bright spikes
  - sudden dark drops
  - persistent darkness that likely means the camera is blocked
"""

from collections import deque
import time

import cv2
import numpy as np

import config as C
from violation_logger import ViolationLogger, ViolationType
from utils import capture_screenshot


HISTORY_LEN = C.LIGHT_HISTORY_LEN
SPIKE_DELTA = C.LIGHT_SPIKE_DELTA
DARK_THRESHOLD = C.LIGHT_DARK_THRESHOLD
DARK_DURATION_SEC = C.LIGHT_DARK_DURATION_SEC
EVENT_COOLDOWN_SEC = C.LIGHT_EVENT_COOLDOWN_SEC


class LightingMonitor:
    """Monitor ambient brightness for suspicious changes."""

    def __init__(self, logger: ViolationLogger):
        self.logger = logger
        self._history = deque(maxlen=HISTORY_LEN)
        self._dark_start = None
        self._blocked_since = None
        self._last_event_time = 0.0
        self.current_brightness = 0
        self.status = "NORMAL"
        print("[LightingMonitor] Initialised.")

    def process(self, frame_bgr, annotated_bgr, frame_index: int) -> dict:
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        brightness = float(np.mean(gray))
        self.current_brightness = int(brightness)

        camera_blocked = self._check_camera_blocked(brightness, frame_bgr, annotated_bgr, frame_index)
        spike_detected = self._check_sudden_spike(brightness, frame_bgr, annotated_bgr, frame_index)

        self._history.append(brightness)
        self._draw_info(annotated_bgr, brightness)

        return {
            "brightness": self.current_brightness,
            "status": self.status,
            "camera_blocked": camera_blocked,
            "too_dark": self.status == "too_dark",
            "dark_duration_sec": round((time.time() - self._dark_start), 2) if self._dark_start else 0.0,
            "blocked_duration_sec": round((time.time() - self._blocked_since), 2) if self._blocked_since else 0.0,
            "light_change": spike_detected,
        }

    def _check_camera_blocked(self, brightness, frame, annotated, frame_index):
        now = time.time()

        if brightness >= DARK_THRESHOLD:
            self._dark_start = None
            self._blocked_since = None
            if self.status in {"too_dark", "blocked"}:
                self.status = "NORMAL"
            return False

        if self._dark_start is None:
            self._dark_start = now

        elapsed = now - self._dark_start

        if elapsed >= DARK_DURATION_SEC:
            self.status = "blocked"
            if self._blocked_since is None:
                self._blocked_since = now

            cv2.putText(
                annotated,
                f"CAMERA BLOCKED - dark for {elapsed:.1f}s",
                (20, 255),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.75,
                (0, 0, 220),
                2,
                cv2.LINE_AA,
            )

            if now - self._last_event_time >= EVENT_COOLDOWN_SEC:
                path = capture_screenshot(frame, frame_index, "camera_blocked")
                self.logger.log(
                    violation_type=ViolationType.CAMERA_BLOCKED,
                    confidence=0.95,
                    screenshot_path=path,
                    extra={
                        "brightness": self.current_brightness,
                        "elapsed_sec": round(elapsed, 2),
                    },
                )
                self._last_event_time = now

            return True

        self._blocked_since = None
        self.status = "too_dark"
        remaining = max(0.0, DARK_DURATION_SEC - elapsed)
        cv2.putText(
            annotated,
            f"LOW LIGHT - blocked in {remaining:.1f}s if it persists",
            (20, 255),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.75,
            (0, 140, 255),
            2,
            cv2.LINE_AA,
        )
        return False

    def _check_sudden_spike(self, brightness, frame, annotated, frame_index):
        if len(self._history) < 10:
            return False

        baseline = float(np.mean(list(self._history)[-10:]))
        delta = abs(brightness - baseline)
        now = time.time()

        if delta > SPIKE_DELTA and now - self._last_event_time >= EVENT_COOLDOWN_SEC:
            direction = "light_spike" if brightness > baseline else "dark_spike"
            self.status = direction
            path = capture_screenshot(frame, frame_index, "light_spike")
            self.logger.log(
                violation_type=ViolationType.LIGHTING_CHANGE,
                confidence=min(1.0, delta / (SPIKE_DELTA * 2)),
                screenshot_path=path,
                extra={
                    "direction": direction,
                    "delta": round(delta, 1),
                    "brightness": self.current_brightness,
                },
            )
            self._last_event_time = now
            return True

        return False

    def _draw_info(self, annotated, brightness):
        color = (0, 0, 200) if brightness < DARK_THRESHOLD else (0, 220, 80)
        cv2.putText(
            annotated,
            f"Light: {int(brightness)}  [{self.status}]",
            (annotated.shape[1] - 260, 240),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            color,
            1,
            cv2.LINE_AA,
        )
