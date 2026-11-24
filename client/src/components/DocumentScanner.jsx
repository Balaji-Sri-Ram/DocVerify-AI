import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, RefreshCw, RotateCcw, Check, AlertCircle, ShieldCheck, SwitchCamera } from 'lucide-react';

// Global registry of all active camera streams to guarantee 100% hardware release
const activeMediaStreams = new Set();

/**
 * Stop all active camera tracks across the device hardware immediately.
 * Ensures the physical camera LED indicator turns off without delay.
 */
export function stopAllCameraHardware() {
  activeMediaStreams.forEach((stream) => {
    try {
      if (stream && stream.getTracks) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch (_) {}
        });
      }
    } catch (_) {}
  });
  activeMediaStreams.clear();
}

/**
 * DocumentScanner
 * Clean manual camera scanner:
 * - Live camera viewfinder with document framing guide & corner brackets
 * - Front/rear camera toggle (for mobile devices)
 * - Manual shutter button ("Click Picture")
 * - Post-capture review card with "Re-click / Retake" and "Use This Photo"
 */
export default function DocumentScanner({ onCapture, _selectedType, onCancel }) {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const streamRef = useRef(null);
  const isMountedRef = useRef(true);
  const isCancelledRef = useRef(false);
  const isConfirmedRef = useRef(false);

  // Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);

  // Captured photo states
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState(null);

  // Stop video stream and release hardware completely
  const stopStream = useCallback(() => {
    isCancelledRef.current = true;

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch (_) {}
        });
      } catch (_) {}
      activeMediaStreams.delete(streamRef.current);
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
        if (videoRef.current.srcObject) {
          const s = videoRef.current.srcObject;
          if (s && s.getTracks) {
            s.getTracks().forEach((track) => {
              try {
                track.stop();
                track.enabled = false;
              } catch (_) {}
            });
          }
          activeMediaStreams.delete(s);
        }
      } catch (_) {}
      videoRef.current.srcObject = null;
    }

    stopAllCameraHardware();
    setCameraActive(false);
  }, []);

  // Check if device has multiple cameras
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      }).catch(() => {});
    }
  }, []);

  // Start video stream
  const startCamera = useCallback(async () => {
    stopStream();
    setCameraError(null);
    isCancelledRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser or environment. Please use the Upload File option.');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Guard: if unmounted or switched away while getUserMedia was pending, kill tracks immediately
      if (!isMountedRef.current || isCancelledRef.current) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch (_) {}
        });
        return;
      }

      activeMediaStreams.add(stream);
      streamRef.current = stream;

      stream.getTracks().forEach((track) => {
        track.onended = () => {
          const allEnded = stream.getTracks().every((t) => t.readyState === 'ended');
          if (allEnded) activeMediaStreams.delete(stream);
        };
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        if (isMountedRef.current && !isCancelledRef.current) {
          setCameraActive(true);
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.warn('Camera initialization error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings or switch to file upload.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on your device. Please use the Upload File option.');
      } else {
        setCameraError(`Camera error: ${err.message || 'Unable to start camera stream'}. Please try uploading your image.`);
      }
    }
  }, [facingMode, stopStream]);

  // Toggle between front and back camera
  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Manual Shutter: Capture snapshot from video feed cropped to framing guide box
  const handleManualCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Trigger visual camera shutter flash
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 200);

    const videoWidth = video.videoWidth || 1280;
    const videoHeight = video.videoHeight || 720;

    let cropX = 0;
    let cropY = 0;
    let cropWidth = videoWidth;
    let cropHeight = videoHeight;

    // Calculate exact crop coordinates from the framing guide box
    if (frameRef.current && videoRef.current) {
      const frameRect = frameRef.current.getBoundingClientRect();
      const videoRect = videoRef.current.getBoundingClientRect();

      const dispW = videoRect.width;
      const dispH = videoRect.height;

      if (dispW > 0 && dispH > 0 && videoWidth > 0 && videoHeight > 0) {
        // Video is rendered with CSS object-cover
        const dispAspect = dispW / dispH;
        const videoAspect = videoWidth / videoHeight;

        let scale = 1;
        let offsetX = 0;
        let offsetY = 0;

        if (videoAspect > dispAspect) {
          // Video is wider than element -> sides are cropped
          scale = videoHeight / dispH;
          const renderedWidthInVideo = dispW * scale;
          offsetX = (videoWidth - renderedWidthInVideo) / 2;
          offsetY = 0;
        } else {
          // Video is taller than element -> top/bottom are cropped
          scale = videoWidth / dispW;
          const renderedHeightInVideo = dispH * scale;
          offsetX = 0;
          offsetY = (videoHeight - renderedHeightInVideo) / 2;
        }

        const relX = Math.max(0, frameRect.left - videoRect.left);
        const relY = Math.max(0, frameRect.top - videoRect.top);
        const relW = frameRect.width;
        const relH = frameRect.height;

        cropX = Math.round(offsetX + relX * scale);
        cropY = Math.round(offsetY + relY * scale);
        cropWidth = Math.round(relW * scale);
        cropHeight = Math.round(relH * scale);

        // Clamping to valid video frame bounds
        cropX = Math.max(0, Math.min(cropX, videoWidth - 20));
        cropY = Math.max(0, Math.min(cropY, videoHeight - 20));
        cropWidth = Math.max(20, Math.min(cropWidth, videoWidth - cropX));
        cropHeight = Math.max(20, Math.min(cropHeight, videoHeight - cropY));
      }
    }

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = cropWidth;
    offscreenCanvas.height = cropHeight;

    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) return;

    // Draw only the cropped bounding box portion of the camera stream
    ctx.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    offscreenCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const pad = (n) => String(n).padStart(2, '0');
        const now = new Date();
        const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const filename = `Camera_Scan_${timestamp}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(blob);

        setCapturedBlob(file);
        setCapturedPreviewUrl(previewUrl);

        // Turn off camera hardware immediately after capturing photo
        stopStream();
        stopAllCameraHardware();
      },
      'image/jpeg',
      0.95
    );
  };

  // Retake photo: discard captured snapshot and restart camera
  const handleRetake = () => {
    isConfirmedRef.current = false;
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
    }
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    startCamera();
  };

  // Confirm photo: pass to parent verification workflow and shut down hardware
  const handleConfirm = () => {
    isConfirmedRef.current = true;
    stopStream();
    stopAllCameraHardware();
    if (capturedBlob && capturedPreviewUrl) {
      onCapture(capturedBlob, capturedPreviewUrl);
    }
  };

  // Cancel scanner and shut down hardware
  const handleCancelScanner = () => {
    stopStream();
    stopAllCameraHardware();
    if (onCancel) onCancel();
  };

  // Mount/Unmount Lifecycle: shut down hardware when leaving scanner
  useEffect(() => {
    isMountedRef.current = true;
    startCamera();

    return () => {
      isMountedRef.current = false;
      isCancelledRef.current = true;
      stopStream();
      stopAllCameraHardware();
    };
  }, [startCamera, stopStream]);

  // Cleanup preview URL on unmount only if user did not confirm the photo
  useEffect(() => {
    return () => {
      if (capturedPreviewUrl && !isConfirmedRef.current) {
        URL.revokeObjectURL(capturedPreviewUrl);
      }
    };
  }, [capturedPreviewUrl]);

  return (
    <div className="space-y-4">
      {/* Main Viewfinder / Review Card */}
      <div className="relative rounded-2xl overflow-hidden bg-forest-deep border-2 border-forest shadow-md">
        {/* Camera Shutter Flash Animation */}
        {isFlashActive && (
          <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-200 pointer-events-none" />
        )}

        {/* State 1: Camera Error */}
        {cameraError && !capturedPreviewUrl && (
          <div className="p-8 text-center bg-warm-white text-forest-deep space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto shadow-xs">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-base text-red-950">Unable to Start Camera Scanner</h4>
            <p className="text-xs text-forest/80 max-w-md mx-auto leading-relaxed">{cameraError}</p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-forest text-warm-white text-xs font-semibold hover:bg-forest-deep transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Camera Again</span>
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={handleCancelScanner}
                  className="px-4 py-2 rounded-xl border border-muted-border bg-beige-light text-forest text-xs font-semibold hover:bg-beige transition-all cursor-pointer"
                >
                  Switch to Upload
                </button>
              )}
            </div>
          </div>
        )}

        {/* State 2: Live Video Feed & Scanner Viewfinder */}
        {!cameraError && !capturedPreviewUrl && (
          <div className="relative aspect-[4/3] xs:aspect-[16/11] sm:aspect-[16/10] w-full min-h-[260px] sm:min-h-[340px] max-h-[460px] flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Dark vignette framing overlay */}
            <div className="absolute inset-0 bg-radial-[ellipse_at_center,_transparent_45%,_rgba(0,0,0,0.65)_95%] pointer-events-none" />

            {/* Document Guide Frame with Emerald Corner Brackets */}
            <div className="absolute inset-3 xs:inset-5 sm:inset-8 flex items-center justify-center pointer-events-none">
              <div
                ref={frameRef}
                className="relative w-full h-full max-w-sm sm:max-w-md max-h-56 sm:max-h-72 rounded-xl sm:rounded-2xl border-2 border-white/40 border-dashed bg-black/10 flex items-center justify-center"
              >
                {/* 4 L-shaped Corner Guides */}
                <div className="absolute -top-1 -left-1 w-5 h-5 sm:w-6 sm:h-6 border-t-3 sm:border-t-4 border-l-3 sm:border-l-4 border-emerald-400 rounded-tl-lg shadow-sm" />
                <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 border-t-3 sm:border-t-4 border-r-3 sm:border-r-4 border-emerald-400 rounded-tr-lg shadow-sm" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 sm:w-6 sm:h-6 border-b-3 sm:border-b-4 border-l-3 sm:border-l-4 border-emerald-400 rounded-bl-lg shadow-sm" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 border-b-3 sm:border-b-4 border-r-3 sm:border-r-4 border-emerald-400 rounded-br-lg shadow-sm" />

                {/* Center crosshair watermark */}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/20 flex items-center justify-center opacity-40">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                </div>
              </div>
            </div>

            {/* Top Bar inside Viewfinder: Guidance Pill & Switch Camera Button */}
            <div className="absolute top-2 sm:top-3 inset-x-2 sm:inset-x-3 flex items-center justify-between pointer-events-auto gap-2">
              <div className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-warm-white text-[11px] sm:text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate max-w-[170px] xs:max-w-[220px] sm:max-w-xs">Align document inside frame</span>
              </div>

              {/* Flip camera button (if device has front/rear) */}
              {hasMultipleCameras && (
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  className="p-1.5 sm:p-2 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-warm-white hover:bg-black/80 active:scale-95 transition-all cursor-pointer shadow-xs shrink-0"
                  title="Switch Camera"
                  aria-label="Switch Camera"
                >
                  <SwitchCamera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
                </button>
              )}
            </div>

            {/* Bottom hint inside viewfinder */}
            <div className="absolute bottom-2 sm:bottom-3 inset-x-2 sm:inset-x-3 flex justify-center pointer-events-none">
              <span className="text-[10px] sm:text-[11px] text-white/90 font-medium px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-black/55 backdrop-blur-xs drop-shadow-sm truncate max-w-[95%]">
                Tap button below when document is clear
              </span>
            </div>
          </div>
        )}

        {/* State 3: Captured Photo Review Card */}
        {capturedPreviewUrl && (
          <div className="p-3.5 sm:p-5 md:p-6 bg-warm-white text-forest-deep space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-base text-forest-deep truncate">Photo Captured</h4>
                  <p className="text-[10px] sm:text-[11px] text-forest/70 truncate">Review the document image before submitting</p>
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-sage text-forest uppercase shrink-0">
                Captured
              </span>
            </div>

            {/* Snapshot Image Container */}
            <div className="relative aspect-[4/3] sm:aspect-[16/10] max-h-60 sm:max-h-80 w-full rounded-xl overflow-hidden border border-muted-border bg-beige-light flex items-center justify-center shadow-inner">
              <img
                src={capturedPreviewUrl}
                alt="Captured Document"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Action Buttons: Re-click / Retake and Use This Photo */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
              <button
                type="button"
                onClick={handleRetake}
                className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl border border-muted-border bg-warm-white text-forest-deep font-semibold text-xs sm:text-sm hover:bg-beige hover:border-forest/40 active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs touch-manipulation min-h-[44px]"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-forest/70 shrink-0" />
                <span>Re-click / Retake</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl bg-forest text-warm-white font-bold text-xs sm:text-sm hover:bg-forest-deep active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs touch-manipulation min-h-[44px]"
              >
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Use This Photo</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Click Picture Button Below Scanner */}
      {!cameraError && !capturedPreviewUrl && cameraActive && (
        <div className="flex flex-col items-center justify-center space-y-1.5 pt-1">
          <button
            type="button"
            onClick={handleManualCapture}
            className="w-full sm:w-auto min-w-0 sm:min-w-[260px] py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-forest text-warm-white font-bold text-xs sm:text-sm md:text-base hover:bg-forest-deep active:scale-[0.98] transition-all shadow-md flex items-center justify-center space-x-2 sm:space-x-2.5 cursor-pointer touch-manipulation group min-h-[46px]"
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-warm-white/80 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
              <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-warm-white" />
            </div>
            <span>Click Picture Now</span>
          </button>

          <p className="text-[10px] sm:text-[11px] text-forest/70 text-center px-2">
            Position document inside frame and tap to take picture
          </p>
        </div>
      )}
    </div>
  );
}
