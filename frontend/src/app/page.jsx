"use client";
import React, { useState, useRef } from "react";

export default function Home() {
  const [imageUrl, setImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloadEnabled, setIsDownloadEnabled] = useState(false);
  const fileInputRef = useRef(null);
  let lastObjectUrl = null;

  const handleDetectClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setIsLoading(true);
    setIsDownloadEnabled(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const detectResp = await fetch("http://127.0.0.1:8000/yolo/detect/", {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });
      // Check if the response is ok
      if (!detectResp.ok) {
        const msg = await detectResp.text().catch(() => "");
        throw new Error(`Detect failed: ${detectResp.status} ${msg}`);
      }

      const data = await detectResp.json();

      if (data?.image_url) {
        const loadUrl =
          "http://127.0.0.1:8000/yolo/load?filepath=" +
          encodeURIComponent(data.image_url);
        const loadResp = await fetch(loadUrl, {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "image/*" },
        });
        if (!loadResp.ok) {
          const msg = await loadResp.text().catch(() => "");
          throw new Error(`Load failed: ${loadResp.status} ${msg}`);
        }

        const blob = await loadResp.blob();
        const imageObjectUrl = URL.createObjectURL(blob);

        // Revoke the object URL after use to free up memory
        if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
        lastObjectUrl = imageObjectUrl;

        // Set the image URL to display the processed image
        setImageUrl(imageObjectUrl);
        setIsDownloadEnabled(true);
      } else {
        alert("Failed to process image: " + data.message);
      }
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Error processing image");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadClick = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/yolo/download/`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `processed-image.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Failed to download image");
      }
    } catch (error) {
      console.error("Error downloading image:", error);
      alert("Error downloading image");
    }
  };

  return (
    <>
      <div className="container">
        <h1 className="title">Object Detection App</h1>

        <div className="button-container">
          <button
            className="btn btn-primary"
            onClick={handleDetectClick}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Detect"}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleDownloadClick}
            disabled={!isDownloadEnabled}
          >
            Download
          </button>
        </div>

        <div className="image-container">
          {isLoading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>Processing image...</p>
            </div>
          )}

          {imageUrl && !isLoading ? (
            <img src={imageUrl} alt="Processed" className="processed-image" />
          ) : (
            !isLoading && (
              <div className="placeholder">
                <p>Upload an image to see it here</p>
              </div>
            )
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
      </div>
    </>
  );
}
