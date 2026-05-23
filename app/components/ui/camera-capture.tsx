import { useState, useRef, useEffect } from "react";
import { Camera, X, Check } from "lucide-react";
import { Button } from "./button";

type CameraCaptureProps = {
  onCapture: (dataUrl: string) => void;
};

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const [active, setActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
      setActive(true);
    } catch (err) {
      console.error("Camera access failed", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  };

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
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

  if (!active) {
    return (
      <Button
        type="button"
        onClick={startCamera}
        variant="nozarOutline"
        className="flex items-center gap-2"
      >
        <Camera className="w-4 h-4" />
        Quick-Snap
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <video ref={videoRef} className="w-full h-full object-cover" />
      <div className="absolute bottom-8 flex gap-4">
        <Button type="button" onClick={stopCamera} variant="ghost" className="bg-red-500/20">
          <X className="w-6 h-6" />
        </Button>
        <Button type="button" onClick={capture} variant="nozar" className="bg-emerald-500 w-16 h-16 rounded-full">
          <Camera className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}