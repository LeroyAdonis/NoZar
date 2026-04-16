/**
 * Quick-Snap Camera Component
 * 
 * A PWA-optimized camera component for quick photo capture.
 * Designed for mobile-first usage with native camera access.
 * 
 * Features:
 * - Native camera access via getUserMedia
 * - Rear camera preference (capture="environment")
 * - Client-side compression before upload
 * - Multiple photo capture in one session
 * - Preview with retake/delete functionality
 * - Haptic feedback on capture
 * - Fallback for unsupported browsers
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, Loader2, RefreshCw, Trash2, X, Zap } from 'lucide-react';
import { Button } from './button';
import {
  compressImage,
  isCompressionSupported,
  formatFileSize,
  type CompressionResult,
} from '~/lib/image-compression';

// ─── Types ─────────────────────────────────────────────────────

export interface CapturedPhoto {
  /** Unique identifier for this photo */
  id: string;
  /** Original file before compression */
  originalFile: File;
  /** Compressed file ready for upload */
  compressedFile: File;
  /** Data URL for preview */
  preview: string;
  /** Compression metadata */
  compression: {
    originalSize: number;
    compressedSize: number;
    ratio: number;
  };
  /** Upload status */
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  /** Uploaded URL (after successful upload) */
  url?: string;
}

export interface QuickSnapCameraProps {
  /** Callback when photos are ready to be uploaded */
  onPhotosReady: (photos: CapturedPhoto[]) => void;
  /** Maximum number of photos allowed */
  maxPhotos?: number;
  /** Whether to auto-upload after capture */
  autoUpload?: boolean;
  /** Custom upload handler (if autoUpload is true) */
  uploadHandler?: (file: File) => Promise<string>;
  /** Called when camera encounters an error */
  onError?: (error: string) => void;
  /** Additional class names */
  className?: string;
}

// ─── Constants ─────────────────────────────────────────────────

const CAMERA_PERMISSION_DENIED = 'Permission to access camera was denied';
const CAMERA_NOT_SUPPORTED = 'Camera access is not supported on this device';
const CAMERA_IN_USE = 'Camera is being used by another application';
const MAX_PHOTOS_DEFAULT = 5;

// ─── Utility Functions ─────────────────────────────────────────

function generatePhotoId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Main Component ────────────────────────────────────────────

export function QuickSnapCamera({
  onPhotosReady,
  maxPhotos = MAX_PHOTOS_DEFAULT,
  autoUpload = false,
  uploadHandler,
  onError,
  className = '',
}: QuickSnapCameraProps) {
  // ─── State ──────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [compressionSupported, setCompressionSupported] = useState(true);

  // ─── Refs ───────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ─── Check compression support on mount ────────────────────
  useEffect(() => {
    setCompressionSupported(isCompressionSupported());
  }, []);

  // ─── Camera Stream Management ──────────────────────────────
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Check for API support
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = CAMERA_NOT_SUPPORTED;
      setError(msg);
      onError?.(msg);
      setIsLoading(false);
      return;
    }

    try {
      // Request camera with rear camera preference
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);

      // Attach to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      let message = 'Failed to access camera';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          message = CAMERA_PERMISSION_DENIED;
        } else if (err.name === 'NotReadableError') {
          message = CAMERA_IN_USE;
        } else {
          message = err.message;
        }
      }

      setError(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // ─── Open/Close Handlers ───────────────────────────────────
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    // Small delay to ensure DOM is ready before starting camera
    setTimeout(() => {
      startCamera();
    }, 100);
  }, [startCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    setIsOpen(false);
    setError(null);
  }, [stopCamera]);

  // ─── Capture Photo ─────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;
    if (photos.length >= maxPhotos) return;

    setIsCapturing(true);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas dimensions to match video
      const width = video.videoWidth;
      const height = video.videoHeight;
      canvas.width = width;
      canvas.height = height;

      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      ctx.drawImage(video, 0, 0, width, height);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.95 // High quality initial capture
        );
      });

      // Create file from blob
      const originalFile = new File([blob], `capture_${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      // Compress the image
      let compressionResult: CompressionResult;
      
      if (compressionSupported) {
        compressionResult = await compressImage(originalFile, {
          maxWidth: 1920,
          quality: 0.8,
          maxFileSize: 500 * 1024,
          format: 'image/jpeg',
        });
      } else {
        // Fallback: use original file
        compressionResult = {
          file: originalFile,
          originalSize: originalFile.size,
          compressedSize: originalFile.size,
          compressionRatio: 1,
          dataUrl: canvas.toDataURL('image/jpeg', 0.95),
          dimensions: { width, height },
        };
      }

      const newPhoto: CapturedPhoto = {
        id: generatePhotoId(),
        originalFile,
        compressedFile: compressionResult.file,
        preview: compressionResult.dataUrl,
        compression: {
          originalSize: compressionResult.originalSize,
          compressedSize: compressionResult.compressedSize,
          ratio: compressionResult.compressionRatio,
        },
        status: 'pending',
      };

      setPhotos((prev) => [...prev, newPhoto]);

      // Double haptic to confirm capture
      if (navigator.vibrate) {
        setTimeout(() => navigator.vibrate!(30), 100);
      }
    } catch (err) {
      console.error('[QuickSnap] Capture failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to capture photo';
      setError(message);
      onError?.(message);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, photos.length, maxPhotos, compressionSupported, onError]);

  // ─── Delete Photo ───────────────────────────────────────────
  const handleDelete = useCallback((photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }, []);

  // ─── Confirm Photos ─────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    onPhotosReady(photos);
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([20, 50, 20]);
    }
    
    handleClose();
  }, [photos, onPhotosReady, handleClose]);

  // ─── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // ─── Render ────────────────────────────────────────────────

  // Closed state - show trigger button
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className={`
          flex flex-col items-center justify-center gap-2
          w-full rounded-xl border-2 border-dashed
          border-white/10 bg-[#0F172A]/50
          hover:border-emerald-500/30 hover:bg-emerald-500/5
          transition-all duration-200
          py-6 cursor-pointer
          ${className}
        `}
        aria-label="Open camera to take photos"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <Camera className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">
            Quick Snap
          </p>
          <p className="text-xs text-slate-500">
            Take photos with your camera
          </p>
        </div>
      </button>
    );
  }

  // Open state - show camera viewfinder
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera viewfinder */}
      <div className="relative flex-1 bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-sm text-slate-400">Starting camera...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10 p-6">
            <div className="flex flex-col items-center gap-4 text-center max-w-sm">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-white font-medium">{error}</p>
              <p className="text-xs text-slate-500">
                Try using the file picker below instead
              </p>
              <Button
                variant="nozarOutline"
                onClick={handleClose}
                className="mt-2"
              >
                Go Back
              </Button>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(1)' }} // Normal orientation for rear camera
        />

        {/* Top bar with close button and photo count */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
          <button
            type="button"
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Close camera"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
            <span className="text-xs font-mono text-white">
              {photos.length} / {maxPhotos}
            </span>
          </div>
        </div>

        {/* Thumbnail gallery */}
        {photos.length > 0 && (
          <div className="absolute bottom-32 left-0 right-0 px-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative shrink-0 group"
                >
                  <img
                    src={photo.preview}
                    alt="Captured"
                    className="w-20 h-20 rounded-lg object-cover border-2 border-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleDelete(photo.id)}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete photo"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-safe bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-center gap-8">
            {/* Confirm button (if photos captured) */}
            {photos.length > 0 && (
              <button
                type="button"
                onClick={handleConfirm}
                className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-colors"
                aria-label="Confirm photos"
              >
                <Check className="w-7 h-7 text-white" />
              </button>
            )}

            {/* Capture button */}
            <button
              type="button"
              onClick={handleCapture}
              disabled={isCapturing || photos.length >= maxPhotos}
              className={`
                w-20 h-20 rounded-full border-4 border-white flex items-center justify-center
                transition-all duration-150
                ${isCapturing || photos.length >= maxPhotos
                  ? 'bg-white/30 opacity-50'
                  : 'bg-white hover:bg-white/90 active:scale-95'
                }
              `}
              aria-label="Take photo"
            >
              {isCapturing ? (
                <Loader2 className="w-8 h-8 text-slate-700 animate-spin" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white" />
              )}
            </button>

            {/* Retake/Refresh (placeholder for symmetry) */}
            <div className="w-14 h-14">
              {photos.length > 0 && (
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={isCapturing || photos.length >= maxPhotos}
                  className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-50"
                  aria-label="Take another photo"
                >
                  <RefreshCw className="w-6 h-6 text-white" />
                </button>
              )}
            </div>
          </div>

          {/* Max photos reached indicator */}
          {photos.length >= maxPhotos && (
            <p className="text-center text-xs text-amber-400 mt-3">
              Maximum {maxPhotos} photos reached
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Fallback File Picker Component ───────────────────────────

export function FilePickerFallback({
  onFilesSelected,
  maxFiles = 5,
  accept = 'image/jpeg,image/png,image/webp',
  className = '',
}: {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  accept?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const limited = files.slice(0, maxFiles);
    if (limited.length > 0) {
      onFilesSelected(limited);
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture="environment"
        multiple
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`
          flex items-center justify-center gap-2
          w-full rounded-xl border border-white/10
          bg-[#0F172A] text-white
          hover:bg-[#0F172A]/80 transition-colors
          py-3 px-4 cursor-pointer
          ${className}
        `}
      >
        <Zap className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-medium">Or pick from gallery</span>
      </button>
    </>
  );
}

// ─── Combined Component with Fallback ──────────────────────────

export function QuickSnapWithFallback({
  onPhotosReady,
  maxPhotos = 5,
  onError,
  className = '',
}: {
  onPhotosReady: (photos: CapturedPhoto[]) => void;
  maxPhotos?: number;
  onError?: (error: string) => void;
  className?: string;
}) {
  const [cameraSupported, setCameraSupported] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Check camera support on mount
  useEffect(() => {
    const supported = !!(navigator.mediaDevices?.getUserMedia);
    setCameraSupported(supported);
  }, []);

  const handleFilePick = useCallback(async (files: File[]) => {
    const photos: CapturedPhoto[] = [];

    for (const file of files.slice(0, maxPhotos)) {
      try {
        const result = await compressImage(file, {
          maxWidth: 1920,
          quality: 0.8,
          maxFileSize: 500 * 1024,
          format: 'image/jpeg',
        });

        photos.push({
          id: generatePhotoId(),
          originalFile: file,
          compressedFile: result.file,
          preview: result.dataUrl,
          compression: {
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            ratio: result.compressionRatio,
          },
          status: 'pending',
        });
      } catch (err) {
        console.error('[QuickSnap] Failed to compress file:', err);
      }
    }

    if (photos.length > 0) {
      onPhotosReady(photos);
    }
  }, [maxPhotos, onPhotosReady]);

  // Show camera if supported and user opened it
  if (showCamera && cameraSupported) {
    return (
      <QuickSnapCamera
        onPhotosReady={onPhotosReady}
        maxPhotos={maxPhotos}
        onError={(err) => {
          onError?.(err);
          setShowCamera(false);
        }}
      />
    );
  }

  // Show fallback UI
  return (
    <div className={`space-y-3 ${className}`}>
      {cameraSupported ? (
        <>
          <QuickSnapCamera
            onPhotosReady={onPhotosReady}
            maxPhotos={maxPhotos}
            onError={onError}
          />
          <FilePickerFallback
            onFilesSelected={handleFilePick}
            maxFiles={maxPhotos}
          />
        </>
      ) : (
        <>
          <div className="rounded-xl border border-white/10 bg-[#0F172A]/50 p-4 text-center">
            <Camera className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              Camera not available on this device
            </p>
          </div>
          <FilePickerFallback
            onFilesSelected={handleFilePick}
            maxFiles={maxPhotos}
          />
        </>
      )}
    </div>
  );
}

export default QuickSnapCamera;
