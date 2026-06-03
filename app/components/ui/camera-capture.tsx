import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "./button";

type CameraCaptureProps = {
  onCapture: (dataUrl: string) => void;
};

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const [active, setActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera when active becomes true (video element is already in DOM)
  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const start = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play().catch((err) => {
            console.warn("Camera autoplay failed", err);
          });
        }
      } catch (err) {
        console.error("Camera access failed", err);
        alert("Could not access camera. Please check permissions.");
        setActive(false);
      }
    };
    start();

    return () => {
      cancelled = true;
    };
  }, [active]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const openCamera = () => {
    // Set active first so the video element mounts, then useEffect wires the stream
    setActive(true);
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  const capture = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
      onCapture(canvas.toDataURL("image/jpeg"));
      stopCamera();
    }
  };

  return (
    <>
      {!active ? (
        <Button
          type="button"
          onClick={openCamera}
          variant="nozarOutline"
          className="flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          Quick-Snap
        </Button>
      ) : (
        <>
          {/* Camera overlay — fullscreen, covers nav */}
          <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          {/* Shutter controls — separate high-z layer, positioned above mobile nav */}
          <div
            className="fixed left-1/2 -translate-x-1/2 z-[110] flex gap-6"
            style={{ bottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}
          >
            <Button
              type="button"
              onClick={stopCamera}
              variant="ghost"
              className="bg-red-500/20 w-14 h-14 rounded-full flex items-center justify-center"
            >
              <X className="w-6 h-6" />
            </Button>
            <Button
              type="button"
              onClick={capture}
              variant="nozar"
              className="bg-emerald-500 w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)]"
            >
              <Camera className="w-6 h-6" />
            </Button>
          </div>
        </>
      )}
    </>
  );
}
