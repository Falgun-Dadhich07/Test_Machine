"use client";
import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import Webcam from "react-webcam";
import { Box, Chip, Typography, CircularProgress } from "@mui/joy";
import { CheckCircle, Warning, Group, VideocamOff, CameraAlt } from "@mui/icons-material";
import { storage } from "../firebase-config";
import { ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";

export interface CustomWebcamProps {
  examSubject?: string;
  userId?: string;
  onFaceAnomaly?: (anomaly: { type: string; message: string; count: number }) => void;
  onSnapshotUploaded?: (url: string) => void;
  enableSnapshots?: boolean;
}

export interface CustomWebcamHandle {
  captureSnapshot: () => Promise<string | null>;
}

const CustomWebcam = forwardRef<CustomWebcamHandle, CustomWebcamProps>(function CustomWebcam(
  {
    examSubject = "quiz",
    userId = "anonymous",
    onFaceAnomaly,
    onSnapshotUploaded,
    enableSnapshots = true,
  },
  ref
) {
  const webcamRef = useRef<any>(null);
  const [detector, setDetector] = useState<any>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [faceCount, setFaceCount] = useState<number>(1);
  const [statusMessage, setStatusMessage] = useState<string>("Initializing camera & AI...");
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [lastSnapshotTime, setLastSnapshotTime] = useState<string | null>(null);

  // Expose captureSnapshot helper to parent via ref
  const captureSnapshot = useCallback(async (): Promise<string | null> => {
    if (!webcamRef.current) return null;
    try {
      // Capture lightweight low-res thumbnail
      const imageSrc = webcamRef.current.getScreenshot({ width: 240, height: 160 });
      if (!imageSrc) return null;

      const hasStorageBucket = !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

      // If Cloud Storage bucket is configured, upload to Storage
      if (storage && hasStorageBucket && userId && userId !== "anonymous") {
        try {
          const timestamp = Date.now();
          const safeSubject = encodeURIComponent(examSubject || "exam");
          const fileRef = storageRef(storage, `proctor_snapshots/${safeSubject}/${userId}/${timestamp}.jpg`);
          await uploadString(fileRef, imageSrc, "data_url");
          const downloadUrl = await getDownloadURL(fileRef);
          setLastSnapshotTime(new Date().toLocaleTimeString());
          onSnapshotUploaded?.(downloadUrl);
          return downloadUrl;
        } catch (storageErr) {
          console.warn("Storage upload failed, falling back to in-memory snapshot:", storageErr);
        }
      }

      // 100% Free Fallback (No Cloud Storage needed):
      // Record timestamp and pass compressed thumbnail data directly for Firestore logging
      setLastSnapshotTime(new Date().toLocaleTimeString());
      onSnapshotUploaded?.(imageSrc);
      return imageSrc;
    } catch (err) {
      console.warn("Snapshot capture skipped:", err);
      return null;
    }
  }, [examSubject, userId, onSnapshotUploaded]);

  useImperativeHandle(ref, () => ({
    captureSnapshot,
  }));

  // 1. Initialize Face Detector in browser (Client-side Edge ML)
  useEffect(() => {
    let isMounted = true;

    async function loadFaceModel() {
      try {
        // Dynamically load tfjs & face-detection to keep initial bundle fast
        const tf = await import("@tensorflow/tfjs");
        await tf.ready();
        const faceDetection = await import("@tensorflow-models/face-detection");

        const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
        const detectorConfig: any = {
          runtime: "tfjs",
          maxFaces: 5,
        };

        const loadedDetector = await faceDetection.createDetector(model, detectorConfig);
        if (isMounted) {
          setDetector(loadedDetector);
          setModelLoading(false);
          setStatusMessage("AI Proctoring Active");
        }
      } catch (error) {
        console.warn("Could not load full face detector, running in fallback webcam mode:", error);
        if (isMounted) {
          setModelLoading(false);
          setStatusMessage("Camera Active");
        }
      }
    }

    loadFaceModel();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Periodic Face Estimation Loop (Runs every 3 seconds)
  useEffect(() => {
    if (!detector || !cameraActive) return;

    let consecutiveAnomalies = 0;
    const interval = setInterval(async () => {
      if (!webcamRef.current?.video) return;
      const video = webcamRef.current.video;

      if (video.readyState === 4) {
        try {
          const faces = await detector.estimateFaces(video, { flipHorizontal: false });
          const count = faces ? faces.length : 0;
          setFaceCount(count);

          if (count === 0) {
            consecutiveAnomalies++;
            setStatusMessage("No face in frame!");
            if (consecutiveAnomalies >= 2) {
              onFaceAnomaly?.({
                type: "NO_FACE",
                message: "No examinee detected in camera view.",
                count: 0,
              });
            }
          } else if (count > 1) {
            consecutiveAnomalies++;
            setStatusMessage(`Multiple faces detected (${count})!`);
            if (consecutiveAnomalies >= 2) {
              onFaceAnomaly?.({
                type: "MULTIPLE_FACES",
                message: `Multiple individuals detected in webcam (${count} faces).`,
                count,
              });
            }
          } else {
            consecutiveAnomalies = 0;
            setStatusMessage("Verified: 1 examinee");
          }
        } catch (err) {
          // Frame error, skip
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [detector, cameraActive, onFaceAnomaly]);

  // 3. Periodic Low-Res Snapshot Upload (Every 2.5 minutes)
  useEffect(() => {
    if (!enableSnapshots || !cameraActive) return;

    // First snapshot after 20 seconds
    const initialTimer = setTimeout(() => {
      captureSnapshot();
    }, 20000);

    // Then recurring every 150 seconds (2.5 minutes)
    const recurringTimer = setInterval(() => {
      captureSnapshot();
    }, 150000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(recurringTimer);
    };
  }, [enableSnapshots, cameraActive, captureSnapshot]);

  const getStatusColor = () => {
    if (!cameraActive) return "neutral";
    if (faceCount === 1) return "success";
    if (faceCount === 0) return "danger";
    return "warning";
  };

  const getStatusIcon = () => {
    if (!cameraActive) return <VideocamOff fontSize="small" />;
    if (faceCount === 1) return <CheckCircle fontSize="small" />;
    if (faceCount === 0) return <Warning fontSize="small" />;
    return <Group fontSize="small" />;
  };

  return (
    <Box sx={{ width: "100%", position: "relative", textAlign: "center" }}>
      <Box
        sx={{
          position: "relative",
          borderRadius: "md",
          overflow: "hidden",
          border: "2px solid",
          borderColor:
            faceCount === 1
              ? "success.300"
              : faceCount === 0
              ? "danger.400"
              : "warning.400",
          bgcolor: "neutral.900",
          minHeight: 180,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Webcam
          ref={webcamRef}
          audio={false}
          width={280}
          height={180}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 320,
            height: 240,
            facingMode: "user",
          }}
          onUserMedia={() => setCameraActive(true)}
          onUserMediaError={() => {
            setCameraActive(false);
            setStatusMessage("Webcam permission denied!");
          }}
          style={{ width: "100%", height: "auto", display: "block" }}
        />

        {/* Live Status Badge overlay */}
        <Box
          sx={{
            position: "absolute",
            top: 6,
            left: 6,
            zIndex: 10,
          }}
        >
          <Chip
            size="sm"
            variant="solid"
            color={getStatusColor()}
            startDecorator={modelLoading ? <CircularProgress size="sm" /> : getStatusIcon()}
            sx={{ fontWeight: "bold", fontSize: "0.75rem", boxShadow: "sm" }}
          >
            {statusMessage}
          </Chip>
        </Box>

        {lastSnapshotTime && (
          <Box
            sx={{
              position: "absolute",
              bottom: 6,
              right: 6,
              zIndex: 10,
            }}
          >
            <Chip
              size="sm"
              variant="soft"
              color="neutral"
              startDecorator={<CameraAlt fontSize="small" />}
              sx={{ fontSize: "0.65rem", opacity: 0.85 }}
            >
              Audited: {lastSnapshotTime}
            </Chip>
          </Box>
        )}
      </Box>

      <Typography level="body-xs" color="neutral" sx={{ mt: 1 }}>
        Proctoring Active: Live Face Check & Periodic Auditing
      </Typography>
    </Box>
  );
});

export default CustomWebcam;
