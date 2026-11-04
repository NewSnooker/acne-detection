"""
ทดสอบการแปลงผลจาก YOLO เป็นจำนวนสิวแต่ละชนิด (YoloService.predict)
ใช้โมเดลจำลองที่คืนกรอบตรวจจับตามที่กำหนด ไม่รัน YOLO จริง
"""
import pytest

from app.services import yolo_service
from app.services.yolo_service import ACNE_CLASSES, YoloService


class _Value:
    """เลียนแบบ tensor 1 ค่า: box.cls[0].item()"""

    def __init__(self, value):
        self._value = value

    def item(self):
        return self._value


class _Coords:
    """เลียนแบบ tensor พิกัด: box.xyxy[0].tolist()"""

    def __init__(self, coords):
        self._coords = coords

    def tolist(self):
        return list(self._coords)


class FakeBox:
    def __init__(self, cls_id, conf=0.9, xyxy=(10.0, 20.0, 30.0, 40.0)):
        self.cls = [_Value(cls_id)]
        self.conf = [_Value(conf)]
        self.xyxy = [_Coords(xyxy)]


class FakeResult:
    def __init__(self, boxes):
        self.boxes = boxes


class FakeModel:
    def __init__(self, results):
        self.results = results
        self.called_with = None

    def __call__(self, image_path, conf, verbose, augment=False):
        self.called_with = {"image": image_path, "conf": conf, "verbose": verbose, "augment": augment}
        return self.results


@pytest.fixture()
def use_model(monkeypatch):
    def _use(boxes):
        model = FakeModel([FakeResult(boxes)])
        monkeypatch.setattr(yolo_service, "_get_model", lambda path: model)
        return model

    return _use


def test_class_order_matches_thesis_scope():
    """ลำดับคลาสต้องตรงกับที่เทรนโมเดล (ขอบเขตข้อ 1.3.3.1: สิว 6 ชนิด) ถ้าสลับ ชื่อชนิดสิวจะผิดทั้งระบบ"""
    assert ACNE_CLASSES == {
        0: "blackhead",
        1: "cyst",
        2: "nodule",
        3: "papule",
        4: "pustule",
        5: "whitehead",
    }


def test_no_detection_returns_zero_for_all_six_types(use_model):
    use_model([])

    result = YoloService().predict("img.jpg", "model.pt", 0.25)

    assert result["total"] == 0
    assert result["detections"] == []
    assert result["counts"] == {
        "blackhead": 0,
        "cyst": 0,
        "nodule": 0,
        "papule": 0,
        "pustule": 0,
        "whitehead": 0,
    }


def test_counts_each_acne_type_separately(use_model):
    use_model([FakeBox(0), FakeBox(0), FakeBox(3), FakeBox(3), FakeBox(3), FakeBox(4), FakeBox(1), FakeBox(5)])

    result = YoloService().predict("img.jpg", "model.pt", 0.25)

    assert result["counts"] == {
        "blackhead": 2,
        "cyst": 1,
        "nodule": 0,
        "papule": 3,
        "pustule": 1,
        "whitehead": 1,
    }
    assert result["total"] == 8
    assert sum(result["counts"].values()) == result["total"]


def test_detection_shape_and_rounding(use_model):
    use_model([FakeBox(2, conf=0.876543, xyxy=(10.04, 20.06, 30.449, 40.95))])

    result = YoloService().predict("img.jpg", "model.pt", 0.25)

    assert result["detections"] == [
        {
            "type": "nodule",
            "confidence": 0.8765,
            "bbox": {"x1": 10.0, "y1": 20.1, "x2": 30.4, "y2": 41.0},
        }
    ]


def test_unknown_class_id_is_ignored(use_model):
    use_model([FakeBox(3), FakeBox(99), FakeBox(6)])

    result = YoloService().predict("img.jpg", "model.pt", 0.25)

    assert result["total"] == 1
    assert result["counts"]["papule"] == 1


def test_confidence_threshold_is_passed_to_model(use_model):
    model = use_model([])

    YoloService().predict("face.jpg", "model.pt", 0.4)

    assert model.called_with == {"image": "face.jpg", "conf": 0.4, "verbose": False, "augment": False}


def test_tta_is_passed_to_model(use_model):
    model = use_model([])

    YoloService().predict("face.jpg", "model.pt", 0.15, augment=True)

    assert model.called_with["augment"] is True


def test_result_without_boxes_is_handled(monkeypatch):
    model = FakeModel([FakeResult(None)])
    monkeypatch.setattr(yolo_service, "_get_model", lambda path: model)

    result = YoloService().predict("img.jpg", "model.pt", 0.25)

    assert result["total"] == 0


def test_model_is_loaded_once_and_reused(monkeypatch):
    """โมเดลถูกโหลดเข้าหน่วยความจำครั้งเดียวต่อไฟล์ (ครั้งแรกช้า ครั้งถัดไปเร็ว)"""
    loaded = []

    class CountingYOLO:
        def __init__(self, path):
            loaded.append(path)

    monkeypatch.setattr(yolo_service, "YOLO", CountingYOLO)
    yolo_service.clear_cache()

    first = yolo_service._get_model("a.pt")
    second = yolo_service._get_model("a.pt")
    yolo_service._get_model("b.pt")

    assert first is second
    assert loaded == ["a.pt", "b.pt"]
    yolo_service.clear_cache()


def test_class_names_match_expected_order():
    assert yolo_service.class_names_mismatch(dict(ACNE_CLASSES)) == {}
    assert yolo_service.class_names_mismatch({str(k): v for k, v in ACNE_CLASSES.items()}) == {}


def test_class_names_mismatch_reports_swapped_classes():
    swapped = dict(ACNE_CLASSES)
    swapped[0], swapped[5] = swapped[5], swapped[0]
    assert yolo_service.class_names_mismatch(swapped) == {
        0: ("whitehead", "blackhead"),
        5: ("blackhead", "whitehead"),
    }


def test_class_names_plural_or_case_still_match():
    # โมเดลที่เทรนจาก Acne14k ใช้ชื่อพหูพจน์ — ลำดับตรง ไม่ควรเตือน
    plural = {i: f"{name}s" for i, name in ACNE_CLASSES.items()}
    assert yolo_service.class_names_mismatch(plural) == {}
    assert yolo_service.class_names_mismatch({0: "Blackheads", **{i: n for i, n in ACNE_CLASSES.items() if i}}) == {}


def test_class_names_plural_swapped_still_reported():
    plural = {i: f"{name}s" for i, name in ACNE_CLASSES.items()}
    plural[1], plural[2] = plural[2], plural[1]
    assert set(yolo_service.class_names_mismatch(plural)) == {1, 2}


def test_class_names_unknown_format_is_ignored():
    assert yolo_service.class_names_mismatch(None) == {}
