# blacklist_store.py
import json
import os
from collections import defaultdict

# JSON file that stores blacklist + detection counts
BLACKLIST_FILE = "blacklist_store.json"


def load_store():
    """
    Load persistent blacklist + counts from disk.
    If file doesn't exist, return an empty structure.
    """
    if os.path.exists(BLACKLIST_FILE):
        try:
            with open(BLACKLIST_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"counts": {}, "blacklist": []}

    return {"counts": {}, "blacklist": []}


def save_store(store):
    """
    Save blacklist + counts back to disk.
    """
    with open(BLACKLIST_FILE, "w", encoding="utf-8") as f:
        json.dump(store, f, indent=4, ensure_ascii=False)


def increment_counts(raw_detections, confirmed_tags, increment=1, threshold=3):
    """
    For each YOLO raw detection that was NOT confirmed by hybrid logic,
    increment the false-positive count.

    After a label crosses `threshold`, it is added to blacklist.
    """
    store = load_store()

    counts = defaultdict(int, store.get("counts", {}))
    blacklist = set(store.get("blacklist", []))

    confirmed_lower = set(t.lower() for t in confirmed_tags)

    for det in raw_detections:
        name = det.get("class", "").lower()
        if not name:
            continue

        # If YOLO predicted it but hybrid logic did NOT accept it → increment count
        if name not in confirmed_lower:
            counts[name] += increment

            # After N times, permanently block this label
            if counts[name] >= threshold:
                blacklist.add(name)

    store["counts"] = dict(counts)
    store["blacklist"] = sorted(list(blacklist))

    save_store(store)
    return store
