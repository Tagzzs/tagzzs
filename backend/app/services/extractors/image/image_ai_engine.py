# image_ai_engine.py
import io
import os
import json
import requests
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import torch
import pytesseract
import easyocr
from transformers import BlipForConditionalGeneration, BlipProcessor
from transformers import CLIPProcessor, CLIPModel
import nltk
from nltk import word_tokenize, pos_tag

# YOLOv8 (Ultralytics)
from ultralytics import YOLO

# Ensure NLTK data
nltk.download("punkt", quiet=True)
nltk.download("averaged_perceptron_tagger", quiet=True)


class ImageAIEngineHybrid:
    """
    Hybrid engine with conservative tagging, JSON outputs, and debug helpers.
    """

    def __init__(
        self,
        yolo_model: str = "yolov8s.pt",
        clip_model: str = "openai/clip-vit-base-patch32",
        caption_model: str = "Salesforce/blip-image-captioning-base",
        device: str = None,
    ):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        # YOLO model (Ultralytics)
        self.yolo = YOLO(yolo_model)
        self.yolo_model_name = yolo_model

        # CLIP
        self.clip_processor = CLIPProcessor.from_pretrained(clip_model)
        self.clip_model = CLIPModel.from_pretrained(clip_model).to(self.device)
        self.clip_model_name = clip_model

        # BLIP caption
        self.caption_processor = BlipProcessor.from_pretrained(caption_model)
        self.caption_model = BlipForConditionalGeneration.from_pretrained(
            caption_model
        ).to(self.device)
        self.caption_model_name = caption_model

        # OCR (easy fallback)
        self.ocr_reader = easyocr.Reader(["en"])

        # Default candidate labels (extend for domain)
        self.CANDIDATE_LABELS = [
            "person", "man", "woman", "child", "dog", "cat",
            "car", "bicycle", "motorcycle", "bus", "truck",
            "building", "tree", "forest", "mountain", "sky",
            "flower", "animal", "bird", "road", "bridge",
            "phone", "laptop", "book", "sign", "logo", "text",
            "earth", "globe", "space", "planet", "ocean", "satellite",
            "movie poster", "poster", "superhero", "marvel", "avengers",
            "thanos", "iron man", "captain america", "black widow"
        ]

    # -------------------------
    # Utilities
    # -------------------------
    def _load_image(self, file=None, image_url=None):
        if file:
            img = Image.open(file).convert("RGB")
            return img
        if image_url:
            resp = requests.get(image_url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
            img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            return img
        raise ValueError("Provide either file or image_url.")

    # -------------------------
    # OCR
    # -------------------------
    def _run_ocr(self, pil_image):
        text = pytesseract.image_to_string(pil_image).strip()
        if text:
            return text
        try:
            arr = np.array(pil_image)
            results = self.ocr_reader.readtext(arr)
            return " ".join([r[1] for r in results]).strip()
        except Exception:
            return ""

    # -------------------------
    # Caption
    # -------------------------
    def _caption(self, img: Image.Image, max_length: int = 40):
        inputs = self.caption_processor(images=img, return_tensors="pt").to(self.device)
        with torch.no_grad():
            output = self.caption_model.generate(**inputs, max_length=max_length)
        caption = self.caption_processor.decode(output[0], skip_special_tokens=True)
        return caption

    def _generate_description(self, caption: str):
        cap = caption.rstrip(".")
        return f"This image likely shows {cap}. The primary subject appears clearly in the frame."

    # -------------------------
    # YOLO detection
    # -------------------------
    def _yolo_detect(self, pil_image: Image.Image, conf_thresh: float = 0.25):
        arr = np.array(pil_image)
        results = self.yolo(arr, imgsz=640, augment=False)[0]
        detections = []
        for box in results.boxes.data.tolist():
            x1, y1, x2, y2, score, cls_id = box
            if score < conf_thresh:
                continue
            cls_name = self.yolo.names[int(cls_id)]
            detections.append(
                {
                    "class": cls_name,
                    "confidence": float(score),
                    "box": [float(x1), float(y1), float(x2), float(y2)],
                }
            )
        return detections

    # -------------------------
    # CLIP scoring
    # -------------------------
    def _clip_score(self, pil_image: Image.Image, candidate_labels, top_k=8):
        inputs = self.clip_processor(
            text=candidate_labels, images=pil_image, return_tensors="pt", padding=True
        ).to(self.device)
        with torch.no_grad():
            outputs = self.clip_model(**inputs)
            logits_per_image = outputs.logits_per_image
            probs = logits_per_image.softmax(dim=1).cpu().numpy()[0]
        scored = list(zip(candidate_labels, probs.tolist()))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    # -------------------------
    # Caption nouns
    # -------------------------
    def _nouns_from_caption(self, caption):
        tokens = word_tokenize(caption)
        pos = pos_tag(tokens)
        nouns = [w.lower() for w, t in pos if t.startswith("NN")]
        return list(dict.fromkeys(nouns))

    # -------------------------
    # Conservative hybrid tags (improved)
    # -------------------------
    def _hybrid_tags(
        self,
        pil_image,
        caption,
        yolo_detections,
        scene_candidates=None,
        yolo_conf_accept=0.80,
        yolo_crop_confirm_thresh=0.30,
        yolo_min_area_ratio=0.004,
        scene_clip_thresh=0.10,
        max_tags=12,
        blacklist=None,
    ):
        if blacklist is None:
            blacklist = set()

        tags_out = []
        seen = set()
        img_w, img_h = pil_image.width, pil_image.height
        img_area = img_w * img_h

        # 1) Filter tiny boxes
        filtered_yolo = []
        for det in yolo_detections:
            x1, y1, x2, y2 = det["box"]
            w = max(0.0, x2 - x1)
            h = max(0.0, y2 - y1)
            area = w * h
            if area < (yolo_min_area_ratio * img_area):
                continue
            filtered_yolo.append(det)

        # 2) Confirm YOLO: accept if high-conf OR CLIP crop confirms label
        for det in sorted(filtered_yolo, key=lambda d: d["confidence"], reverse=True):
            name = det["class"].lower()
            yconf = float(det["confidence"])
            if name in blacklist:
                continue

            keep = False
            source = None
            final_score = yconf

            if yconf >= yolo_conf_accept:
                keep = True
                source = "yolo_highconf"
                final_score = yconf
            else:
                x1, y1, x2, y2 = map(int, det["box"])
                # safety crop bounds
                x1 = max(0, x1)
                y1 = max(0, y1)
                x2 = min(img_w, x2)
                y2 = min(img_h, y2)
                if x2 <= x1 or y2 <= y1:
                    continue
                try:
                    crop = pil_image.crop((x1, y1, x2, y2)).resize((224, 224))
                    crop_candidates = list(
                        dict.fromkeys(
                            [name]
                            + self._nouns_from_caption(caption)
                            + (scene_candidates or [])
                            + self.CANDIDATE_LABELS
                        )
                    )
                    crop_scores = self._clip_score(crop, crop_candidates, top_k=6)
                    found_score = 0.0
                    for lbl, sc in crop_scores:
                        if lbl.lower() == name:
                            found_score = float(sc)
                            break
                    if found_score >= yolo_crop_confirm_thresh:
                        keep = True
                        source = "yolo_clip_confirm"
                        final_score = float((yconf + found_score) / 2.0)
                except Exception:
                    keep = False

            if keep and name not in seen:
                tags_out.append({"tag": name, "score": float(final_score), "source": source})
                seen.add(name)

        # 3) Global CLIP for scene/theme (conservative)
        scene_candidates = scene_candidates or list(
            dict.fromkeys(self._nouns_from_caption(caption) + self.CANDIDATE_LABELS)
        )
        scene_scores = self._clip_score(pil_image, scene_candidates, top_k=16)
        for lbl, sc in scene_scores:
            lname = lbl.lower()
            if sc >= scene_clip_thresh and lname not in seen and lname not in blacklist:
                tags_out.append({"tag": lname, "score": float(sc), "source": "clip_scene"})
                seen.add(lname)

        # 4) Caption nouns fallback
        for n in self._nouns_from_caption(caption):
            if n not in seen:
                tags_out.append({"tag": n, "score": 0.02, "source": "caption_noun"})
                seen.add(n)

        # 5) sort & trim
        tags_out.sort(key=lambda x: x["score"], reverse=True)
        return tags_out[:max_tags]

    # -------------------------
    # Debug helpers
    # -------------------------
    def save_debug_crops(self, pil_image, yolo_detections, out_dir="debug_output"):
        os.makedirs(out_dir, exist_ok=True)
        saved = []
        for i, det in enumerate(yolo_detections):
            x1, y1, x2, y2 = map(int, det["box"])
            # ensure valid box
            if x2 <= x1 or y2 <= y1:
                continue
            crop = pil_image.crop((x1, y1, x2, y2))
            fname = os.path.join(out_dir, f"crop_{i}_{det['class']}_{det['confidence']:.2f}.jpg")
            crop.save(fname)
            saved.append(fname)
        return saved

    def save_annotated_image(self, pil_image, yolo_detections, out_path="annotated.png"):
        draw = ImageDraw.Draw(pil_image)

        try:
            font = ImageFont.load_default()
        except Exception:
            font = None

        for det in yolo_detections:
            x1, y1, x2, y2 = det["box"]
            cls_name = det["class"]
            conf = det["confidence"]

            # Draw bounding box
            draw.rectangle([x1, y1, x2, y2], outline="red", width=3)

            label = f"{cls_name} {conf:.2f}"

            # Compute text width/height safely
            try:
                if font:
                    bbox = draw.textbbox((0, 0), label, font=font)
                    text_w = bbox[2] - bbox[0]
                    text_h = bbox[3] - bbox[1]
                else:
                    text_w = len(label) * 6
                    text_h = 12
            except Exception:
                text_w = len(label) * 6
                text_h = 12

            # Text background
            text_x0 = max(x1, 0)
            text_y0 = max(y1 - text_h - 4, 0)
            draw.rectangle(
                [text_x0, text_y0, text_x0 + text_w + 4, text_y0 + text_h + 4],
                fill="red"
            )

            # Actual text
            try:
                draw.text((text_x0 + 2, text_y0 + 2), label, fill="white", font=font)
            except Exception:
                draw.text((text_x0 + 2, text_y0 + 2), label, fill="white")

        pil_image.save(out_path)
        return out_path

    # -------------------------
    # to_json helper
    # -------------------------
    def to_json(self, result):
        return json.dumps(result, indent=4, ensure_ascii=False)

    # -------------------------
    # Main analyze (public)
    # -------------------------
    def analyze_image(
        self,
        file=None,
        image_url=None,
        yolo_conf_thresh=0.25,
        yolo_conf_accept=0.80,
        yolo_crop_confirm_thresh=0.30,
        yolo_min_area_ratio=0.004,
        scene_clip_thresh=0.10,
        max_tags=12,
        blacklist=None,
        debug_output_dir="debug_output",
        save_debug_outputs=True,
    ):
        pil_img = self._load_image(file=file, image_url=image_url)

        # OCR
        ocr_text = self._run_ocr(pil_img)
        has_text = bool(ocr_text.strip())

        # Caption & description
        caption = self._caption(pil_img)
        description = self._generate_description(caption)

        # YOLO detections (initial)
        raw_yolo_detections = self._yolo_detect(pil_img, conf_thresh=yolo_conf_thresh)

        # Hybrid tags
        tags = self._hybrid_tags(
            pil_image=pil_img,
            caption=caption,
            yolo_detections=raw_yolo_detections,
            scene_candidates=self.CANDIDATE_LABELS,
            yolo_conf_accept=yolo_conf_accept,
            yolo_crop_confirm_thresh=yolo_crop_confirm_thresh,
            yolo_min_area_ratio=yolo_min_area_ratio,
            scene_clip_thresh=scene_clip_thresh,
            max_tags=max_tags,
            blacklist=blacklist,
        )

        # Optionally save debug crops and annotated image
        debug_files = {}
        if save_debug_outputs:
            os.makedirs(debug_output_dir, exist_ok=True)
            try:
                debug_files["annotated_image"] = self.save_annotated_image(
                    pil_img.copy(), raw_yolo_detections, out_path=os.path.join(debug_output_dir, "annotated.png")
                )
            except Exception as e:
                debug_files["annotated_image_error"] = str(e)
            try:
                debug_files["crops"] = self.save_debug_crops(pil_img.copy(), raw_yolo_detections, out_dir=debug_output_dir)
            except Exception as e:
                debug_files["crops_error"] = str(e)

        # Build set of tags that were accepted (names)
        accepted_tag_names = {t["tag"].lower() for t in tags}

        # Confirmed YOLO detections: those whose class matches an accepted tag
        confirmed_yolo_detections = []
        for det in raw_yolo_detections:
            if det["class"].lower() in accepted_tag_names:
                confirmed_yolo_detections.append(det)

        # Add raw detections to debug and return confirmed ones
        debug_files["raw_yolo_detections"] = raw_yolo_detections
        yolo_detections_for_output = confirmed_yolo_detections

        result = {
            "caption": caption,
            "description": description,
            "tags": tags,
            "yolo_detections": yolo_detections_for_output,
            "ocr_text": ocr_text,
            "has_text": has_text,
            "meta": {
                "width": pil_img.width,
                "height": pil_img.height,
                "caption_model": self.caption_model_name,
                "clip_model": self.clip_model_name,
                "yolo_model": self.yolo_model_name,
                "device": self.device,
            },
            "debug_files": debug_files,
        }
        return result
