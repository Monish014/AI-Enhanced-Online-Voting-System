import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * Wraps a set of nested routes.
 * - Redirects to /login if not authenticated.
 * - Redirects to / if authenticated but wrong role.
 * - Renders <Outlet /> (nested routes) when authorised.
 */
export default function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, user, initialized } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" label="Checking session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Wrong role — send to their correct home
    const home = user?.role === 'admin' ? '/admin' : '/voter';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
