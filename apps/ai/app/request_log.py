"""
log เวลาต่อคำขอ — รูปแบบเดียวกับฝั่งเว็บ (apps/web/src/lib/request-log.ts)

- 1 คำขอ = 1 บรรทัด: `predict timing [<request id>]: image 0.04s | model 0.00s | inference 1.87s | total 1.91s | ...`
- request id มาจาก header X-Request-ID ที่เว็บส่งมา — ค้นใน log ด้วย id เดียวกันจะเจอทั้งบรรทัดของเว็บและ ai
- ส่งเวลาแต่ละขั้นกลับใน header Server-Timing (มาตรฐาน W3C, หน่วย ms) ให้เว็บรวมใน log ของตัวเอง
ดูวิธีอ่านที่ dev-docs/performance/web.md
"""
import re
import time
import uuid

_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


def clean_request_id(value: str | None) -> str:
    """ใช้ id ที่เว็บส่งมาถ้ารูปแบบถูก ไม่งั้นสร้างใหม่ (กันค่าแปลก ๆ ปลอมบรรทัด log)"""
    if value and _REQUEST_ID.match(value):
        return value
    return uuid.uuid4().hex[:16]


class StepTimer:
    """จับเวลาทีละขั้น — mark(name) = จบขั้น name นับจากขั้นก่อนหน้า"""

    def __init__(self) -> None:
        self._start = time.perf_counter()
        self._last = self._start
        self._steps: list[tuple[str, float]] = []

    def mark(self, name: str) -> None:
        now = time.perf_counter()
        self._steps.append((name, now - self._last))
        self._last = now

    def _total(self) -> float:
        return time.perf_counter() - self._start

    def summary(self) -> str:
        """`image 0.04s | model 0.00s | total 1.91s` — หน่วยวินาทีให้อ่านง่ายใน Log stream"""
        parts = [f"{name} {sec:.2f}s" for name, sec in self._steps]
        return " | ".join([*parts, f"total {self._total():.2f}s"])

    def server_timing(self) -> str:
        """header Server-Timing เช่น `image;dur=40, model;dur=0, inference;dur=1870, total;dur=1910` (ms)"""
        parts = [f"{name};dur={round(sec * 1000)}" for name, sec in self._steps]
        return ", ".join([*parts, f"total;dur={round(self._total() * 1000)}"])
