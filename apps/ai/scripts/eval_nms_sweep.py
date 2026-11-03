"""
หาค่า conf / iou / agnostic_nms / imgsz ที่ดีที่สุดของโมเดล — รันบน Kaggle (GPU)

ขั้น A (valid): ลองทุกชุด iou × agnostic × imgsz ด้วย conf 0.001 ครั้งเดียว
  แล้วอ่าน F1 ที่ทุกค่า conf จาก F1-confidence curve → ได้ conf ที่ F1 สูงสุดของแต่ละชุด
ขั้น B (test): เทียบค่าเริ่มต้น กับชุดที่ดีที่สุดจากขั้น A (เลือกจาก valid เท่านั้น ไม่เลือกจาก test)

ต้องมีใน notebook: Secret ROBOFLOW_API_KEY, Input acne14k_clean_split.csv,
Input ไฟล์โมเดล (WEIGHTS_GLOB) และเปิด Internet + GPU
ใช้ Save Version → Save & Run All (ประมาณ 1.5 ชม. บน T4 สำหรับโมเดล L)
"""
import glob
import itertools
import os
import shutil

import numpy as np
import pandas as pd
import yaml
from ultralytics import YOLO

RAW, DST = "/kaggle/working/acne14k_raw", "/tmp/acne14k_clean"
DATA = f"{DST}/data.yaml"
OUT = "/kaggle/working/nms_sweep"
NAMES = ["blackhead", "cyst", "nodule", "papule", "pustule", "whitehead"]
WEIGHTS_GLOB = "/kaggle/input/**/acne14k_l_960/weights/best.pt"

TRAIN_IMG = 960                    # ขนาดที่เทรน = ค่าเริ่มต้น
IMGSZ = [960, 1280]
IOU = [0.45, 0.6, 0.7]             # 0.7 = ค่าเริ่มต้นของ Ultralytics
AGNOSTIC = [False, True]
CONF_REPORT = [0.15, 0.2, 0.25]    # ค่า conf ที่อยากเห็น F1 ด้วย
DEFAULT = {"imgsz": TRAIN_IMG, "iou": 0.7, "agnostic": False, "conf": 0.25}


def clean_label(text):
    """แปลง polygon เป็นกรอบ ตัดกรอบขนาด 0 (เหมือนตอนเตรียมข้อมูลเทรน)"""
    out = []
    for ln in text.splitlines():
        q = ln.split()
        if not q:
            continue
        c, v = int(q[0]), list(map(float, q[1:]))
        if len(v) == 4:
            x, y, w, h = v
        else:
            xs, ys = v[0::2], v[1::2]
            x1, x2 = max(0, min(xs)), min(1, max(xs))
            y1, y2 = max(0, min(ys)), min(1, max(ys))
            x, y, w, h = (x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1
        if w > 0 and h > 0:
            out.append(f"{c} {x:.6f} {y:.6f} {w:.6f} {h:.6f}")
    return out


def prepare_dataset():
    """ดาวน์โหลด Acne14k v1 และแบ่งตาม acne14k_clean_split.csv (ข้ามถ้ามีแล้ว)"""
    if os.path.exists(DATA):
        return
    from kaggle_secrets import UserSecretsClient
    from roboflow import Roboflow

    ver = (
        Roboflow(api_key=UserSecretsClient().get_secret("ROBOFLOW_API_KEY"))
        .workspace("s-workspace-fmu4q")
        .project("acne-dataset-6-classes-ubwa5")
        .version(1)
    )
    try:
        ver.download("yolo26", location=RAW)
    except Exception:
        ver.download("yolov8", location=RAW)
    csvs = glob.glob("/kaggle/input/**/acne14k_clean_split.csv", recursive=True)
    assert csvs, "ไม่เจอ acne14k_clean_split.csv: กด Add Input ก่อน"
    sp = pd.read_csv(csvs[0])
    shutil.rmtree(DST, ignore_errors=True)
    for s in ["train", "valid", "test"]:
        os.makedirs(f"{DST}/{s}/images")
        os.makedirs(f"{DST}/{s}/labels")
    for r in sp.itertuples():
        stem = os.path.splitext(r.file)[0]
        src_lab = f"{RAW}/{r.orig_split}/labels/{stem}.txt"
        shutil.copy(f"{RAW}/{r.orig_split}/images/{r.file}", f"{DST}/{r.new_split}/images/{r.file}")
        lines = clean_label(open(src_lab).read() if os.path.exists(src_lab) else "")
        with open(f"{DST}/{r.new_split}/labels/{stem}.txt", "w") as f:
            f.write("\n".join(lines) + ("\n" if lines else ""))
    with open(DATA, "w") as f:
        yaml.safe_dump(
            {"path": DST, "train": "train/images", "val": "valid/images",
             "test": "test/images", "nc": 6, "names": NAMES},
            f, sort_keys=False,
        )
    shutil.rmtree(RAW, ignore_errors=True)


def run_val(model, split, imgsz, iou, agnostic, conf=0.001, plots=False, name=None):
    return model.val(
        data=DATA, split=split, imgsz=imgsz, iou=iou, agnostic_nms=agnostic, conf=conf,
        batch=16 if imgsz <= 960 else 8, device=0, plots=plots, verbose=False,
        project=OUT, name=name or "tmp", exist_ok=True,
    )


def f1_at(r, conf):
    """F1/P/R เฉลี่ยทุกคลาสที่ค่า conf ใด ๆ จาก curve (ไม่ต้องรัน val ใหม่)"""
    px = np.asarray(r.box.px)
    i = int(np.abs(px - conf).argmin())
    p = float(np.mean(r.box.p_curve[:, i]))
    rc = float(np.mean(r.box.r_curve[:, i]))
    return 2 * p * rc / (p + rc + 1e-16) * 100, p * 100, rc * 100


def best_conf(r):
    f1 = np.asarray(r.box.f1_curve).mean(0)
    i = int(f1.argmax())
    return float(np.asarray(r.box.px)[i]), float(f1[i]) * 100


def accuracy(model, split, cfg, name):
    """Det acc / Type acc จาก confusion matrix ที่ conf ที่เลือก"""
    r = run_val(model, split, cfg["imgsz"], cfg["iou"], cfg["agnostic"], conf=cfg["conf"],
                plots=True, name=name)
    m = r.confusion_matrix.matrix  # แถว = ทาย, คอลัมน์ = จริง, ตัวสุดท้าย = พื้นหลัง
    nc = len(NAMES)
    tp = np.trace(m[:nc, :nc])
    wrong_type = m[:nc, :nc].sum() - tp
    fp, fn = m[:nc, nc].sum(), m[nc, :nc].sum()
    return {"Det acc": tp / (tp + wrong_type + fp + fn) * 100,
            "Type acc": tp / (tp + wrong_type) * 100,
            "TP": int(tp), "ชนิดผิด": int(wrong_type), "FP": int(fp), "FN": int(fn)}


def main():
    prepare_dataset()
    weights = glob.glob(WEIGHTS_GLOB, recursive=True)
    assert weights, "ไม่เจอไฟล์โมเดล: Add Input ก่อน"
    model = YOLO(weights[0])
    os.makedirs(OUT, exist_ok=True)

    # ---------- ขั้น A: valid ----------
    rows = []
    for imgsz, agnostic, iou in itertools.product(IMGSZ, AGNOSTIC, IOU):
        r = run_val(model, "val", imgsz, iou, agnostic)
        c, f1 = best_conf(r)
        row = {"imgsz": imgsz, "agnostic": agnostic, "iou": iou,
               "mAP50": r.box.map50 * 100, "mAP50-95": r.box.map * 100,
               "best conf": round(c, 3), "F1@best": f1,
               "ms/ภาพ": sum(r.speed.values())}
        for cr in CONF_REPORT:
            row[f"F1@{cr}"] = f1_at(r, cr)[0]
        rows.append(row)
        print(row)
    sweep = pd.DataFrame(rows).round(2).sort_values("F1@best", ascending=False)
    sweep.to_csv(f"{OUT}/valid_sweep.csv", index=False)
    print("\n=== ขั้น A: valid (เรียงตาม F1 สูงสุด) ===")
    print(sweep.to_string(index=False))

    top = sweep.iloc[0]
    best = {"imgsz": int(top.imgsz), "iou": float(top.iou),
            "agnostic": bool(top.agnostic), "conf": float(top["best conf"])}

    # ---------- ขั้น B: test (ค่าเริ่มต้น vs ชุดที่ดีที่สุดจาก valid) ----------
    final = []
    for label, cfg, name in [("ค่าเริ่มต้น", DEFAULT, "test_default"),
                             ("ดีที่สุดจาก valid", best, "test_best")]:
        r = run_val(model, "test", cfg["imgsz"], cfg["iou"], cfg["agnostic"])
        f1, p, rc = f1_at(r, cfg["conf"])
        row = {"ชุด": label, **cfg, "mAP50": r.box.map50 * 100, "mAP50-95": r.box.map * 100,
               "P": p, "R": rc, "F1": f1, "ms/ภาพ": sum(r.speed.values())}
        row.update(accuracy(model, "test", cfg, name))
        final.append(row)
    final = pd.DataFrame(final).round(2)
    final.to_csv(f"{OUT}/test_compare.csv", index=False)
    print("\n=== ขั้น B: test ===")
    print(final.to_string(index=False))
    a, b = final.iloc[0], final.iloc[1]
    print(f"\nดีที่สุด: imgsz {best['imgsz']}, iou {best['iou']}, agnostic {best['agnostic']}, "
          f"conf {best['conf']:.3f}")
    print(f"test: F1 {b.F1 - a.F1:+.2f} | mAP50 {b.mAP50 - a.mAP50:+.2f} | "
          f"Det acc {b['Det acc'] - a['Det acc']:+.2f} | Type acc {b['Type acc'] - a['Type acc']:+.2f} | "
          f"เวลา ×{b['ms/ภาพ'] / a['ms/ภาพ']:.1f}")


if __name__ == "__main__":
    main()
