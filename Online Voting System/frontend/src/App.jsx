import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from '@context/AuthContext';
import { ElectionProvider } from '@context/ElectionContext';
import ProtectedRoute from '@components/ProtectedRoute';
import LoadingSpinner from '@components/LoadingSpinner';
import ErrorBoundary from '@components/ErrorBoundary';
import ChatbotWidget from '@components/ChatbotWidget';

// ─── Public Pages ─────────────────────────────────────────────────────────────
const LandingPage       = lazy(() => import('@pages/public/LandingPage'));
const LoginPage         = lazy(() => import('@pages/public/LoginPage'));
const RegisterPage      = lazy(() => import('@pages/public/RegisterPage'));
const VoteVerifyPage    = lazy(() => import('@pages/public/VoteVerifyPage'));

// ─── Voter Pages ──────────────────────────────────────────────────────────────
const VoterDashboard    = lazy(() => import('@pages/voter/VoterDashboard'));
const FaceVerification  = lazy(() => import('@pages/voter/FaceVerification'));
const VotingBooth       = lazy(() => import('@pages/voter/VotingBooth'));
const VoteConfirmation  = lazy(() => import('@pages/voter/VoteConfirmation'));

// ─── Admin Pages ──────────────────────────────────────────────────────────────
const AdminDashboard      = lazy(() => import('@pages/admin/AdminDashboard'));
const ElectionManagement  = lazy(() => import('@pages/admin/ElectionManagement'));
const FraudAlerts         = lazy(() => import('@pages/admin/FraudAlerts'));
const ResultsAnalytics    = lazy(() => import('@pages/admin/ResultsAnalytics'));
const AuditLogViewer      = lazy(() => import('@pages/admin/AuditLogViewer'));
const VoterManagement     = lazy(() => import('@pages/admin/VoterManagement'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" label="Loading page..." />
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ElectionProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Public ── */}
              <Route path="/"             element={<LandingPage />} />
              <Route path="/login"        element={<LoginPage />} />
              <Route path="/register"     element={<RegisterPage />} />
              <Route path="/verify-vote"  element={<VoteVerifyPage />} />

              {/* ── Voter (protected) ── */}
              <Route
                path="/voter"
                element={<ProtectedRoute allowedRoles={['voter']} />}
              >
                <Route index                    element={<VoterDashboard />} />
                <Route path="face-verify"       element={<FaceVerification />} />
                <Route path="vote/:electionId"  element={<VotingBooth />} />
                <Route path="confirmation"      element={<VoteConfirmation />} />
              </Route>

              {/* ── Admin (protected) ── */}
              <Route
                path="/admin"
                element={<ProtectedRoute allowedRoles={['admin']} />}
              >
                <Route index                          element={<AdminDashboard />} />
                <Route path="elections"               element={<ElectionManagement />} />
                <Route path="fraud-alerts"            element={<FraudAlerts />} />
                <Route path="results/:electionId"     element={<ResultsAnalytics />} />
                <Route path="results"                 element={<ResultsAnalytics />} />
                <Route path="audit-logs"              element={<AuditLogViewer />} />
                <Route path="voters"                  element={<VoterManagement />} />
              </Route>

              {/* ── Fallback ── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>

          {/* Floating chatbot — visible on voter pages */}
          <ChatbotWidget />
        </ElectionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
