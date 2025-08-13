"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";

/**
 * Minimal, clean UI with:
 * - Solid drag & drop + click upload
 * - Paste-from-clipboard support (Ctrl/Cmd+V)
 * - Clear loading state and error toast
 * - Accessible buttons & focus rings
 * - No heavy backgrounds; inherits site fonts/colors
 */
export default function Home() {
  const [imageUrl, setImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloadEnabled, setIsDownloadEnabled] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fileInputRef = useRef(null);
  const lastObjectUrlRef = useRef(null); // persist across renders

  const showError = (msg) => {
    setErrorMsg(msg);
    // auto-hide
    window.clearTimeout(showError._t);
    showError._t = window.setTimeout(() => setErrorMsg(""), 3200);
  };

  const resetObjectUrl = () => {
    if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
    lastObjectUrlRef.current = null;
  };

  const processServerImage = async (serverPath) => {
    const loadUrl =
      "http://127.0.0.1:8000/yolo/load?filepath=" +
      encodeURIComponent(serverPath);

    const loadResp = await fetch(loadUrl, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "image/*" },
    });
    if (!loadResp.ok) {
      throw new Error(`Load failed: ${loadResp.status}`);
    }

    const blob = await loadResp.blob();
    const objUrl = URL.createObjectURL(blob);
    resetObjectUrl();
    lastObjectUrlRef.current = objUrl;
    setImageUrl(objUrl);
    setIsDownloadEnabled(true);
  };

  const detectFromFile = async (file) => {
    setIsLoading(true);
    setIsDownloadEnabled(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const detectResp = await fetch("http://127.0.0.1:8000/yolo/detect/", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (!detectResp.ok) {
        throw new Error(`Detect failed: ${detectResp.status}`);
      }

      const data = await detectResp.json();

      if (data?.public_url) {
        resetObjectUrl();
        setImageUrl(data.public_url);
        setIsDownloadEnabled(true);
      } else if (data?.image_url) {
        await processServerImage(data.image_url);
      } else {
        throw new Error(data?.message || "No image_url returned");
      }
    } catch (error) {
      console.error("Error processing image:", error);
      showError(error?.message || "Error processing image");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return showError("Please select an image file");
    }
    setFileName(file.name);
    await detectFromFile(file);
  };

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return showError("Please drop an image file");
    }
    setFileName(file.name);
    await detectFromFile(file);
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleReset = () => {
    resetObjectUrl();
    setImageUrl("");
    setIsDownloadEnabled(false);
    setFileName("");
    setErrorMsg("");
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
        showError("Failed to download image");
      }
    } catch (error) {
      console.error("Error downloading image:", error);
      showError("Error downloading image");
    }
  };

  // Paste-from-clipboard (Ctrl/Cmd+V an image)
  useEffect(() => {
    const onPaste = async (e) => {
      const file = e.clipboardData?.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/"))
        return showError("Pasted content is not an image");
      setFileName(file.name || "clipboard-image.png");
      await detectFromFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div className="min-h-screen flex flex-col text-foreground selection:bg-black/10 dark:selection:bg-white/20">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-black/10 dark:border-white/10 bg-transparent backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl border border-black/10 dark:border-white/10 grid place-items-center">
              <span className="text-[11px] font-semibold tracking-wider">
                YO
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight">
              Object Detection
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 ring-black/10 dark:ring-white/10 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/40 dark:focus-visible:ring-white/40"
              aria-label="Reset"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M3 12a9 9 0 1 0 9-9v3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 5v7h7"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 mx-auto max-w-5xl px-4 py-8">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={[
            "relative rounded-2xl border transition-colors overflow-hidden",
            dragActive
              ? "border-black/50 dark:border-white/60"
              : "border-black/15 dark:border-white/15",
          ].join(" ")}
        >
          {/* Overlay label */}
          <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-transparent px-3 py-1 text-[11px]">
            <span className="font-medium">Drop image</span>
            <span className="opacity-70">or click Upload</span>
          </div>

          {/* Canvas */}
          <div className="aspect-[16/9] w-full grid place-items-center bg-transparent">
            {isLoading && (
              <div className="absolute inset-0 grid place-items-center bg-black/5 dark:bg-white/5 backdrop-blur-[1px]">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full border-4 border-black/10 dark:border-white/20 border-t-black dark:border-t-white animate-spin" />
                  <p className="mt-3 text-xs opacity-80">Processing image…</p>
                </div>
              </div>
            )}
            {imageUrl && !isLoading ? (
              <img
                src={imageUrl}
                alt="Processed"
                className="h-full w-full object-contain"
              />
            ) : (
              !isLoading && (
                <div className="text-center p-8">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-xl border border-dashed border-black/30 dark:border-white/30 grid place-items-center">
                    <div className="h-6 w-6 rounded-full border-2 border-dashed border-black/40 dark:border-white/40" />
                  </div>
                  <p className="text-sm opacity-80">
                    Upload / drop / paste an image to start
                  </p>
                  <p className="text-xs opacity-60 mt-1">
                    PNG, JPG. Privacy-friendly: processed locally then fetched
                    from server.
                  </p>
                </div>
              )
            )}
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 dark:border-white/10 bg-transparent px-3 py-3">
            <div className="min-w-0 truncate text-sm opacity-80">
              {fileName ? `Selected: ${fileName}` : "No file selected"}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/40 dark:focus-visible:ring-white/40"
              >
                {isLoading ? "Processing…" : "Upload & Detect"}
              </button>
              <button
                onClick={handleDownloadClick}
                disabled={!isDownloadEnabled}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-black/15 dark:ring-white/15 hover:shadow-sm transition disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/40 dark:focus-visible:ring-white/40"
              >
                Download
              </button>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Tiny helper row */}
        <div className="mt-3 text-xs opacity-70 flex items-center gap-2">
          <kbd className="rounded border px-1.5 py-0.5">Ctrl</kbd>+
          <kbd className="rounded border px-1.5 py-0.5">V</kbd>
          <span>to paste an image from clipboard</span>
        </div>

        {/* Toast for errors */}
        {errorMsg && (
          <div
            role="alert"
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 max-w-[90vw] sm:max-w-md rounded-xl border border-red-200/50 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200 shadow"
          >
            {errorMsg}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-black/10 dark:border-white/10 bg-transparent text-center py-4 text-sm opacity-80">
        © {new Date().getFullYear()} Made by SONG AI
      </footer>
    </div>
  );
}
