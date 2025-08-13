import os

import cv2
from fastapi import APIRouter, UploadFile, File, Query
from fastapi.responses import JSONResponse, FileResponse, Response

from backend.app.model import detect_objects

yolo_router = APIRouter(prefix="/yolo", tags=["Object Detection"])


@yolo_router.post("/detect/", summary="Detect objects")
async def detect(file: UploadFile = File(..., description="Upload image file.")):
    contents = await file.read()
    os.makedirs("outputs", exist_ok=True)
    current_dir = os.getcwd()
    print(current_dir)
    input_image_path = os.getcwd() + "\\outputs\\tem.jpg"
    with open(input_image_path, "wb") as f:
        f.write(contents)

    result = detect_objects(input_image_path)
    img = result.plot()
    output_path = "outputs/detected.jpg"
    cv2.imwrite(output_path, img)

    objects = []
    for box in result.boxes:
        cls = result.names[int(box.cls[0])]
        conf = float(box.conf[0])
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        objects.append(
            {
                "class": cls,
                "confidence": round(conf, 2),
                "bbox": [round(x1), round(y1), round(x2), round(y2)]
            }
        )

    return JSONResponse(
        {
            "image_url": f"{os.getcwd()}\\outputs\\detected.jpg".replace("\\", "/"),
            "objects": objects
        }
    )


@yolo_router.get("/download/", summary="Download image")
async def download_file():
    path = os.path.join("outputs", "detected.jpg")
    if not os.path.isfile(path):
        return JSONResponse({"detail": "File not found"}, status_code=404)
    return FileResponse(path=path, media_type="image/jpeg", filename="detected-image",
                        headers={"Cache-Control": "no-store"})


@yolo_router.get("/load/", summary="Upload image")
async def load_file(
        filepath: str = Query(..., description="Absolute/relative path on server"),
        fmt: str = Query("jpg", description="Return format: jpg | png (optional)"),
):
    if not os.path.isfile(filepath):
        return JSONResponse({"detail": "File not found"}, status_code=404)

    if not fmt:
        return FileResponse(filepath)

    fmt = fmt.lower()
    if fmt not in {"jpg", "png"}:
        return JSONResponse({"detail": "fmt must be 'jpg' or 'png'"}, status_code=400)

    img_bgr = cv2.imread(filepath)
    ok, buf = cv2.imencode(f".jpg", img_bgr)
    if not ok:
        return JSONResponse({"detail": "Image cannot be encoded"}, status_code=500)

    media = "image/jpeg" if fmt == "jpg" else "image/png"
    return Response(content=buf.tobytes(), media_type=media, headers={"Cache-Control": "no-store"})
