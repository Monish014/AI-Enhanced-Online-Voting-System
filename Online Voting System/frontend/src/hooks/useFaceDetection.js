import { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const MODEL_URL = import.meta.env.VITE_FACE_MODEL_URL || '/models';

export default function useFaceDetection(videoRef, canvasRef) {
  const [modelsLoaded,   setModelsLoaded]   = useState(false);
  const [loadError,      setLoadError]      = useState(null);
  const [faceDetected,   setFaceDetected]   = useState(false);
  const [descriptor,     setDescriptor]     = useState(null);
  const [livenessPass,   setLivenessPass]   = useState(false);
  const [livenessPrompt, setLivenessPrompt] = useState({ text: 'Please blink your eyes once' });
  const [livenessStep]                      = useState(0);
  const [detectionScore, setDetectionScore] = useState(0);

  const detectionLoopRef = useRef(null);
  const earHistory       = useRef([]);
  const blinkDetected    = useRef(false);
  const frameCount       = useRef(0);

  // ── Load models ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (!cancelled) setModelsLoaded(true);
      } catch (err) {
        if (!cancelled) setLoadError('Failed to load models: ' + err.message);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── EAR helper ───────────────────────────────────────────────────────────────
  const computeEAR = (eye) => {
    try {
      const A = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
      const B = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
      const C = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
      return C < 0.001 ? 0.3 : (A + B) / (2.0 * C);
    } catch { return 0.3; }
  };

  // ── Detection loop ───────────────────────────────────────────────────────────
  const startDetection = useCallback(() => {
    if (!modelsLoaded || !videoRef?.current) return;

    const loop = async () => {
      const video  = videoRef.current;
      const canvas = canvasRef?.current;

      if (!video || video.readyState < 2) {
        detectionLoopRef.current = requestAnimationFrame(loop);
        return;
      }

      // Run detection every 3rd frame for performance
      frameCount.current += 1;
      if (frameCount.current % 3 !== 0) {
        detectionLoopRef.current = requestAnimationFrame(loop);
        return;
      }

      try {
        // Try multiple input sizes — use whichever detects the face
        let detection = null;

        for (const inputSize of [160, 224, 320, 416]) {
          const opts = new faceapi.TinyFaceDetectorOptions({
            inputSize,
            scoreThreshold: 0.2,
          });
          detection = await faceapi
            .detectSingleFace(video, opts)
            .withFaceLandmarks()
            .withFaceDescriptor();
          if (detection) break;
        }

        // Clear and redraw canvas
        if (canvas && video.videoWidth > 0) {
          const displaySize = { width: video.videoWidth, height: video.videoHeight };
          faceapi.matchDimensions(canvas, displaySize);
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (detection) {
            const resized = faceapi.resizeResults(detection, displaySize);
            const box = resized.detection.box;

            // Green bounding box
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth   = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            // Score label
            ctx.fillStyle    = '#22c55e';
            ctx.font         = '14px Arial';
            ctx.fillText(
              `Face: ${(detection.detection.score * 100).toFixed(0)}%`,
              box.x, box.y > 15 ? box.y - 5 : box.y + 15
            );

            // Landmark dots
            resized.landmarks.positions.forEach((pt) => {
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
              ctx.fill();
            });
          }
        }

        setFaceDetected(!!detection);
        if (detection) {
          setDetectionScore(Math.round(detection.detection.score * 100));
          setDescriptor(Array.from(detection.descriptor));

          // Blink detection via EAR
          if (!blinkDetected.current) {
            const lm       = detection.landmarks;
            const leftEye  = lm.getLeftEye();
            const rightEye = lm.getRightEye();
            const ear      = (computeEAR(leftEye) + computeEAR(rightEye)) / 2;

            earHistory.current.push(ear);
            if (earHistory.current.length > 8) earHistory.current.shift();

            const hist = earHistory.current;
            if (hist.length >= 5) {
              const open   = hist.slice(0, 3).every(v => v > 0.22);
              const closed = hist.slice(-2).some(v => v < 0.19);
              if (open && closed) {
                blinkDetected.current = true;
                setLivenessPass(true);
                setLivenessPrompt(null);
              }
            }
          }
        } else {
          earHistory.current = [];
          setDetectionScore(0);
        }
      } catch (_) { /* skip frame errors */ }

      detectionLoopRef.current = requestAnimationFrame(loop);
    };

    detectionLoopRef.current = requestAnimationFrame(loop);
  }, [modelsLoaded, videoRef, canvasRef]);

  const stopDetection = useCallback(() => {
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
  }, []);

  useEffect(() => () => stopDetection(), [stopDetection]);

  // Manual liveness override — for cases where auto-blink doesn't trigger
  const manualPass = useCallback(() => {
    setLivenessPass(true);
    setLivenessPrompt(null);
  }, []);

  const resetLiveness = useCallback(() => {
    setLivenessPass(false);
    setLivenessPrompt({ text: 'Please blink your eyes once' });
    earHistory.current    = [];
    blinkDetected.current = false;
    frameCount.current    = 0;
  }, []);

  return {
    modelsLoaded,
    loadError,
    faceDetected,
    descriptor,
    detectionScore,
    livenessPass,
    livenessPrompt,
    livenessStep,
    totalSteps: 1,
    startDetection,
    stopDetection,
    resetLiveness,
    manualPass,
  };
}
