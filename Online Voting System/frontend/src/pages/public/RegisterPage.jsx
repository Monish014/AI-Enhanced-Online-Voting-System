import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import authService from '@services/authService';
import StepIndicator from '@components/StepIndicator';
import LoadingSpinner from '@components/LoadingSpinner';

const MODEL_URL = import.meta.env.VITE_FACE_MODEL_URL || '/models';

const STEPS = [
  { label: 'Personal Info' },
  { label: 'Documents' },
  { label: 'Face Capture' },
  { label: 'OTP Verify' },
];

// Step 1 schema
const step1Schema = yup.object({
  name:          yup.string().required('Full name is required').min(2).max(100),
  email:         yup.string().email('Invalid email').required('Email is required'),
  phone:         yup.string().required('Phone is required').min(7).max(15),
  aadhaarNumber: yup.string().optional(),
  password:      yup.string()
    .required('Password is required')
    .min(8, 'At least 8 characters')
    .matches(/(?=.*[A-Z])/, 'Needs an uppercase letter')
    .matches(/(?=.*[0-9])/, 'Needs a number'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm password'),
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep]               = useState(0);
  const [loading, setLoading]         = useState(false);
  const [formData, setFormData]       = useState({});
  const [docFile, setDocFile]         = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [faceImageSrc, setFaceImageSrc]     = useState(null);
  const [modelsLoaded, setModelsLoaded]     = useState(false);
  const [loadingModels, setLoadingModels]   = useState(false);
  const [capturing, setCapturing]           = useState(false);
  const [userId, setUserId]                 = useState(null);
  const [otp, setOtp]                       = useState('');
  const [devOtp, setDevOtp]                 = useState(null); // OTP shown on screen in dev

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(step1Schema),
  });

  // ── Load face-api models when entering step 2 ───────────────────────────────
  const loadModels = async () => {
    if (modelsLoaded) return;
    setLoadingModels(true);
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    } catch {
      toast.error('Failed to load face detection models. Please refresh.');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleNextStep = (data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep(1);
  };

  const handleDocStep = () => {
    setStep(2);
    loadModels();
  };

  // ── Capture face from webcam ─────────────────────────────────────────────────
  const captureFace = async () => {
    if (!webcamRef.current || !modelsLoaded) return;
    setCapturing(true);
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      const img = new Image();
      img.src = imageSrc;
      await new Promise((res) => { img.onload = res; });

      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.warning('No face detected. Please look directly at the camera.');
        return;
      }

      setFaceDescriptor(Array.from(detection.descriptor));
      setFaceImageSrc(imageSrc);
      toast.success('Face captured successfully!');
    } catch (err) {
      toast.error('Face capture failed. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  // ── Submit registration ───────────────────────────────────────────────────────
  const submitRegistration = async () => {
    if (!faceDescriptor) {
      toast.warning('Please capture your face first.');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name',     formData.name);
      fd.append('email',    formData.email);
      fd.append('phone',    formData.phone);
      fd.append('password', formData.password);
      if (formData.aadhaarNumber) fd.append('aadhaarNumber', formData.aadhaarNumber);
      if (docFile) fd.append('documentImage', docFile);
      // Convert base64 face image to Blob for upload
      if (faceImageSrc) {
        const res  = await fetch(faceImageSrc);
        const blob = await res.blob();
        fd.append('faceImage', blob, 'face.jpg');
      }

      const data = await authService.register(fd);
      setUserId(data.data.userId);

      // Enroll face embedding
      await authService.enrollFace(faceDescriptor).catch(() => {});

      // In dev mode account is auto-verified — go straight to login
      if (data.data.autoVerified) {
        toast.success('Registration successful! You can now log in.');
        navigate('/login');
        return;
      }

      // Production — show OTP step
      if (data.data._devOtp) setDevOtp(data.data._devOtp);
      toast.success('Registration successful! Check your email for the OTP.');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────────
  const verifyOtp = async () => {
    if (!userId || otp.length !== 6) return;
    setLoading(true);
    try {
      await authService.verifyOtp(userId, otp);
      toast.success('Account verified! You can now log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 flex flex-col">
      {/* Header */}
      <div className="p-4">
        <Link to="/" className="flex items-center gap-2 w-fit" aria-label="VoteAI home">
          <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">V</span>
          </div>
          <span className="font-bold text-xl text-primary-800">VoteAI</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start p-4 pt-6">
        <div className="w-full max-w-lg animate-slide-up">
          <h1 className="text-2xl font-bold text-slate-900 text-center mb-6">Create Your Voter Account</h1>
          <StepIndicator steps={STEPS} current={step} />

          {/* ── Step 0: Personal Info ── */}
          {step === 0 && (
            <form onSubmit={handleSubmit(handleNextStep)} className="card space-y-4" noValidate>
              <h2 className="section-title">Personal Details</h2>

              {[
                { id: 'name',          label: 'Full Name',      type: 'text',     placeholder: 'John Doe',           auto: 'name' },
                { id: 'email',         label: 'Email Address',  type: 'email',    placeholder: 'john@example.com',   auto: 'email' },
                { id: 'phone',         label: 'Phone Number',   type: 'tel',      placeholder: '+91 98765 43210',    auto: 'tel' },
                { id: 'aadhaarNumber', label: 'Aadhaar Number (optional)', type: 'text', placeholder: 'XXXX XXXX XXXX', auto: 'off' },
              ].map(({ id, label, type, placeholder, auto }) => (
                <div key={id}>
                  <label htmlFor={id} className="label">{label}</label>
                  <input id={id} type={type} autoComplete={auto} {...register(id)}
                    className={`input-field ${errors[id] ? 'input-error' : ''}`} placeholder={placeholder}
                    aria-invalid={!!errors[id]} />
                  {errors[id] && <p className="error-text">{errors[id].message}</p>}
                </div>
              ))}

              <div>
                <label htmlFor="password" className="label">Password</label>
                <input id="password" type="password" autoComplete="new-password" {...register('password')}
                  className={`input-field ${errors.password ? 'input-error' : ''}`} placeholder="Min 8 chars, 1 uppercase, 1 number" />
                {errors.password && <p className="error-text">{errors.password.message}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="label">Confirm Password</label>
                <input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')}
                  className={`input-field ${errors.confirmPassword ? 'input-error' : ''}`} placeholder="Repeat password" />
                {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
              </div>

              <button type="submit" className="btn-primary w-full py-3">Continue →</button>
            </form>
          )}

          {/* ── Step 1: Document Upload ── */}
          {step === 1 && (
            <div className="card space-y-5">
              <h2 className="section-title">Upload ID Document</h2>
              <p className="text-sm text-slate-500">Upload a government-issued ID (Aadhaar, Passport, Voter ID). JPEG, PNG or PDF, max 5 MB.</p>

              <div>
                <label htmlFor="docUpload" className="label">Identity Document</label>
                <input
                  id="docUpload"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => setDocFile(e.target.files[0])}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4
                             file:rounded-lg file:border-0 file:text-sm file:font-semibold
                             file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100
                             cursor-pointer"
                  aria-label="Upload identity document"
                />
                {docFile && (
                  <p className="text-xs text-green-600 mt-1.5 font-medium">✓ {docFile.name}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="btn-secondary flex-1">← Back</button>
                <button onClick={handleDocStep} className="btn-primary flex-1">Continue →</button>
              </div>
            </div>
          )}

          {/* ── Step 2: Face Capture ── */}
          {step === 2 && (
            <div className="card space-y-4">
              <h2 className="section-title">Face Enrollment</h2>
              <p className="text-sm text-slate-500">
                Position your face in the camera. Ensure good lighting and look directly at the lens.
              </p>

              {loadingModels ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <LoadingSpinner size="lg" />
                  <p className="text-sm text-slate-500">Loading AI face detection models...</p>
                </div>
              ) : faceImageSrc ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border-2 border-green-400">
                    <img src={faceImageSrc} alt="Captured face" className="w-full" />
                    <div className="absolute top-2 right-2 badge-success px-2 py-1">✓ Captured</div>
                  </div>
                  <button onClick={() => { setFaceImageSrc(null); setFaceDescriptor(null); }} className="btn-secondary w-full text-sm">
                    Retake Photo
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-black">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      width="100%"
                      videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
                      className="w-full"
                      aria-label="Camera feed for face capture"
                    />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />
                    {/* Face outline guide */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                      <div className="w-44 h-56 border-4 border-white/50 rounded-full" />
                    </div>
                  </div>
                  <button
                    onClick={captureFace}
                    disabled={!modelsLoaded || capturing}
                    className="btn-primary w-full py-3"
                  >
                    {capturing ? <LoadingSpinner size="sm" color="white" label="Detecting..." /> : '📷 Capture Face'}
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
                <button
                  onClick={submitRegistration}
                  disabled={!faceDescriptor || loading}
                  className="btn-primary flex-1"
                >
                  {loading ? <LoadingSpinner size="sm" color="white" label="Registering..." /> : 'Submit Registration'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: OTP Verification ── */}
          {step === 3 && (
            <div className="card space-y-5 text-center">
              <div className="text-5xl" aria-hidden="true">📱</div>
              <h2 className="section-title">Verify Your Account</h2>
              <p className="text-sm text-slate-500">
                Enter the 6-digit OTP to verify your account.
              </p>

              {/* Dev OTP display — shown when email is not configured */}
              {devOtp && (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">⚠️ Development Mode — Your OTP</p>
                  <p className="text-4xl font-bold font-mono tracking-widest text-amber-900">{devOtp}</p>
                  <button
                    type="button"
                    onClick={() => setOtp(devOtp)}
                    className="text-xs bg-amber-500 text-white px-4 py-1.5 rounded-lg hover:bg-amber-600 font-semibold"
                  >
                    Click to auto-fill →
                  </button>
                  <p className="text-xs text-amber-600">Configure Gmail App Password in .env to send real emails</p>
                </div>
              )}

              <div>
                <label htmlFor="otp-input" className="label">One-Time Password</label>
                <input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="input-field text-center text-3xl tracking-widest font-mono py-4"
                  placeholder="000000"
                  aria-label="Enter OTP"
                />
              </div>

              <button
                onClick={verifyOtp}
                disabled={otp.length !== 6 || loading}
                className="btn-primary w-full py-3"
              >
                {loading ? <LoadingSpinner size="sm" color="white" label="Verifying..." /> : 'Verify OTP →'}
              </button>

              <p className="text-xs text-slate-400">
                Already verified?{' '}
                <Link to="/login" className="text-primary-600 hover:underline font-medium">Sign in</Link>
              </p>
            </div>
          )}

          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
