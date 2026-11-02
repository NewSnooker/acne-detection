"""
วัดผล Test-Time Augmentation (TTA) เทียบกับการทำนายปกติ — รันบน Kaggle (GPU)
ผลและวิธีอ่าน: dev-docs/performance/tta.md

ต้องมีใน notebook: Secret ROBOFLOW_API_KEY, Input acne14k_clean_split.csv,
Input output ของรอบเทรนที่มี acne14k_l_960/weights/best.pt และเปิด Internet + GPU
ใช้ Save Version → Save & Run All ปิดเครื่องได้ (ประมาณ 40–50 นาทีบน T4)
"""
import glob
import os
import shutil

import numpy as np
import pandas as pd
import yaml
from ultralytics import YOLO

RAW, DST = "/kaggle/working/acne14k_raw", "/tmp/acne14k_clean"
DATA = f"{DST}/data.yaml"
IMG, CONF = 960, 0.25  # CONF ใช้หา Det/Type acc จาก confusion matrix
OUT = "/kaggle/working/tta_eval"
NAMES = ["blackhead", "cyst", "nodule", "papule", "pustule", "whitehead"]
WEIGHTS_GLOB = "/kaggle/input/**/acne14k_l_960/weights/best.pt"


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


def evaluate():
    weights = glob.glob(WEIGHTS_GLOB, recursive=True)
    assert weights, "ไม่เจอ best.pt: Add Input ก่อน"
    model = YOLO(weights[0])
    nc = len(model.names)
    rows = []
    for split in ["val", "test"]:
        for tta in (False, True):
            # mAP/P/R มาตรฐาน (conf 0.001)
            r = model.val(data=DATA, split=split, imgsz=IMG, batch=16, device=0,
                          augment=tta, plots=False, verbose=False)
            # confusion matrix ต้องเปิด plots
            r2 = model.val(data=DATA, split=split, imgsz=IMG, batch=16, device=0, conf=CONF,
                           augment=tta, plots=True, verbose=False,
                           project=OUT, name=f"{split}_tta{int(tta)}", exist_ok=True)
            m = r2.confusion_matrix.matrix  # แถว = ทาย, คอลัมน์ = จริง, ตัวสุดท้าย = พื้นหลัง
            tp = np.trace(m[:nc, :nc])
            wrong_type = m[:nc, :nc].sum() - tp
            fp, fn = m[:nc, nc].sum(), m[nc, :nc].sum()
            p, rc = r.box.mp, r.box.mr
            rows.append({
                "split": split, "TTA": tta,
                "mAP50": r.box.map50 * 100, "mAP50-95": r.box.map * 100,
                "P": p * 100, "R": rc * 100, "F1": 2 * p * rc / (p + rc) * 100,
                "Det acc": tp / (tp + wrong_type + fp + fn) * 100,
                "Type acc": tp / (tp + wrong_type) * 100,
                "ms/ภาพ (GPU)": sum(r.speed.values()),
            })
    df = pd.DataFrame(rows).round(2)
    os.makedirs(OUT, exist_ok=True)
    df.to_csv(f"{OUT}/tta_compare.csv", index=False)
    print(df.to_string(index=False))
    for split in ["val", "test"]:
        a = df[(df.split == split) & ~df.TTA].iloc[0]
        b = df[(df.split == split) & df.TTA].iloc[0]
        print(f"{split}: mAP50 {b.mAP50 - a.mAP50:+.2f} | F1 {b.F1 - a.F1:+.2f} | "
              f"Type acc {b['Type acc'] - a['Type acc']:+.2f} | "
              f"ช้าลง ×{b['ms/ภาพ (GPU)'] / a['ms/ภาพ (GPU)']:.1f}")
        if (a[["mAP50", "P", "R"]] == b[["mAP50", "P", "R"]]).all():
            print("  ค่าเท่ากันทุกตัว = โมเดลนี้ไม่ได้ใช้ TTA จริง (ดู log 'does not support augment')")


if __name__ == "__main__":
    prepare_dataset()
    evaluate()
