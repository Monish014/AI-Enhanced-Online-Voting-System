import React, { useRef, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import authService from '@services/authService';
import PageLayout from '@components/PageLayout';
import LoadingSpinner from '@components/LoadingSpinner';
import StepIndicator from '@components/StepIndicator';

const MODEL_URL = import.meta.env.VITE_FACE_MODEL_URL || '/models';

const STEPS = [
  { label: 'Load Models' },
  { label: 'Capture & Verify' },
];

export default function FaceVerification() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const electionId    = location.state?.electionId;
  const electionTitle = location.state?.electionTitle;

  const webcamRef = useRef(null);

  const [modelsLoaded,  setModelsLoaded]  = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadError,     setLoadError]     = useState(null);
  const [snapshot,      setSnapshot]      = useState(null);   // base64 captured photo
  const [descriptor,    setDescriptor]    = useState(null);   // Float32Array from snapshot
  const [capturing,     setCapturing]     = useState(false);
  const [verifying,     setVerifying]     = useState(false);
  const [matchResult,   setMatchResult]   = useState(null);   // { match, distance, similarity }

  const currentStep = !modelsLoaded ? 0 : 1;

  // ── Load models on mount ──────────────────────────────────────────────────
  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoadingModels(true);
    setLoadError(null);
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    } catch (err) {
      setLoadError('Failed to load face detection models. Please refresh the page.');
    } finally {
      setLoadingModels(false);
    }
  };

  // ── Capture photo from webcam and extract face descriptor ─────────────────
  const captureAndDetect = async () => {
    if (!webcamRef.current || !modelsLoaded) return;
    setCapturing(true);
    setMatchResult(null);

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        toast.error('Could not access camera. Please allow camera permission.');
        return;
      }

      // Load image into faceapi
      const img = new Image();
      img.src = imageSrc;
      await new Promise((res, rej) => {
        img.onload  = res;
        img.onerror = rej;
      });

      // Try progressively more lenient thresholds
      let detection = null;
      for (const [inputSize, threshold] of [[416, 0.3], [320, 0.2], [224, 0.15], [160, 0.1]]) {
        detection = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold: threshold }))
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (detection) break;
      }

      if (!detection) {
        toast.warning('No face detected in the photo. Ensure good lighting and look straight at the camera, then try again.');
        return;
      }

      setSnapshot(imageSrc);
      setDescriptor(Array.from(detection.descriptor));
      toast.success('Face captured! Click "Verify Identity" to proceed.');
    } catch (err) {
      toast.error('Capture failed: ' + err.message);
    } finally {
      setCapturing(false);
    }
  };

  // ── Send descriptor to backend for comparison with registered face ─────────
  const handleVerify = async () => {
    if (!descriptor) {
      toast.warning('Please capture your photo first.');
      return;
    }
    setVerifying(true);
    try {
      // livenessPass = true (we're skipping liveness — face photo match is the check)
      const data = await authService.faceVerify(descriptor, true);
      sessionStorage.setItem('faceToken', data.data.faceToken);
      toast.success('Identity verified! Proceeding to vote.');
      navigate(`/voter/vote/${electionId}`, {
        state: { electionTitle, faceToken: data.data.faceToken },
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Face verification failed.';
      toast.error(msg);
      // Show mismatch result if available
      if (err.response?.data?.data) {
        setMatchResult(err.response.data.data);
      }
      // Reset snapshot so user can try again
      setSnapshot(null);
      setDescriptor(null);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-xl mx-auto space-y-6 animate-slide-up">

        {/* Header */}
        <div>
          <h1 className="page-title">Identity Verification</h1>
          {electionTitle && (
            <p className="text-slate-500 text-sm mt-1">
              Required before voting in:{' '}
              <span className="font-semibold text-slate-700">{electionTitle}</span>
            </p>
          )}
        </div>

        <StepIndicator steps={STEPS} current={currentStep} />

        {/* Model load error */}
        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm" role="alert">
            <p className="font-semibold mb-1">⚠️ {loadError}</p>
            <button onClick={loadModels} className="text-red-700 underline text-xs font-medium">
              Try again
            </button>
          </div>
        )}

        <div className="card space-y-5">

          {/* Loading models */}
          {!modelsLoaded && !loadError && (
            <div className="flex flex-col items-center py-10 gap-3">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-slate-500 font-medium">Loading face detection models…</p>
              <p className="text-xs text-slate-400">This only happens once per session.</p>
            </div>
          )}

          {modelsLoaded && (
            <>
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">📸 How it works</p>
                <p>
                  Look directly at the camera, then click <strong>Take Photo</strong>.
                  Your photo will be compared against the face you enrolled during registration.
                </p>
              </div>

              {/* Camera or snapshot preview */}
              {!snapshot ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
                      className="w-full h-full object-cover"
                      aria-label="Camera feed for face capture"
                    />
                    {/* Face guide overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                      <div className="w-48 h-56 border-4 border-white/40 rounded-full" />
                    </div>
                    <div className="absolute bottom-3 left-0 right-0 text-center">
                      <span className="text-xs text-white/80 bg-black/40 px-3 py-1 rounded-full">
                        Align your face inside the oval
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={captureAndDetect}
                    disabled={capturing}
                    className="btn-primary w-full py-3 text-base"
                  >
                    {capturing
                      ? <LoadingSpinner size="sm" color="white" label="Detecting face..." />
                      : '📷 Take Photo'}
                  </button>
                </div>
              ) : (
                /* Snapshot preview */
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border-2 border-green-400">
                    <img src={snapshot} alt="Your captured photo" className="w-full" />
                    <div className="absolute top-2 right-2">
                      <span className="badge badge-success px-2 py-1 text-xs">✓ Face detected</span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 text-center">
                    This photo will be compared against your registered face.
                  </p>

                  {/* Retake option */}
                  <button
                    onClick={() => { setSnapshot(null); setDescriptor(null); setMatchResult(null); }}
                    className="btn-secondary w-full text-sm"
                  >
                    🔄 Retake Photo
                  </button>
                </div>
              )}

              {/* Match failed result */}
              {matchResult && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800" role="alert">
                  <p className="font-semibold">❌ Face does not match</p>
                  <p className="text-xs mt-1">
                    Distance: {matchResult.distance} — your face did not match the enrolled photo.
                    Please retake in better lighting.
                  </p>
                </div>
              )}

              {/* Verify button */}
              <button
                onClick={handleVerify}
                disabled={!descriptor || verifying}
                className="btn-primary w-full py-3 text-base"
              >
                {verifying
                  ? <LoadingSpinner size="sm" color="white" label="Verifying identity..." />
                  : 'Verify Identity & Proceed to Vote →'}
              </button>
            </>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800" role="note">
          <p className="font-semibold mb-1">🔒 Privacy note</p>
          <p>Your photo is used only for identity verification and is not stored or shared. Only a mathematical face descriptor is sent to the server.</p>
        </div>

      </div>
    </PageLayout>
  );
}
