# analyze_local_image.py
import json
from pathlib import Path
from image_ai_engine import ImageAIEngineHybrid  # Local test file - ensure image_ai_engine.py is in same folder or PYTHONPATH

img_path = r"C:/Users/kunal/Downloads/2628.webp"
ai = ImageAIEngineHybrid(yolo_model="yolov8s.pt")

params = dict(
    yolo_conf_thresh=0.50,
    yolo_conf_accept=0.80,
    yolo_crop_confirm_thresh=0.30,
    yolo_min_area_ratio=0.004,
    scene_clip_thresh=0.10,
    max_tags=12,
    blacklist=set(),
    debug_output_dir="debug_output",
    save_debug_outputs=True,
)

p = Path(img_path)
if not p.exists():
    print(f"ERROR: file not found: {img_path}")
    raise SystemExit(1)

with open(p, "rb") as f:
    result = ai.analyze_image(file=f, **params)

with open("output_local_image.json", "w", encoding="utf-8") as out:
    json.dump(result, out, indent=4, ensure_ascii=False)

print("Saved output_local_image.json")
print("\nTop tags:")
for t in result["tags"]:
    print(" ", t)
print("\nDebug files:")
for k, v in result.get("debug_files", {}).items():
    print(f" - {k}: {v}")
