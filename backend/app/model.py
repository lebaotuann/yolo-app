from ultralytics import YOLO

MODEL = YOLO("yolov8n.pt")


def detect_objects(image_path):
    results = MODEL(image_path)
    return results[0]
