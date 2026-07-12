import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '@context/AuthContext';
import LoadingSpinner from '@components/LoadingSpinner';

const schema = yup.object({
  email:    yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname;

  const [step, setStep]         = useState('login');
  const [loading, setLoading]   = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from || (user?.role === 'admin' ? '/admin' : '/voter'), { replace: true });
    }
  }, [isAuthenticated]);

  const {
    register, handleSubmit, formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  const onLogin = async ({ email, password }) => {
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      toast.success(`Welcome back, ${result.user.name}!`);
      navigate(from || (result.user.role === 'admin' ? '/admin' : '/voter'), { replace: true });
    } else {
      toast.error(result.message || 'Login failed.');
    }
  };

  const onVerifyOtp = async ({ otp }) => {
    if (!pendingUserId) return;
    setLoading(true);
    try {
      await authService.verifyOtp(pendingUserId, otp);
      toast.success('Account verified! Please log in.');
      setStep('login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed.');
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

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-slide-up">
          <div className="card space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-slate-900">Sign in to VoteAI</h1>
              <p className="text-slate-500 text-sm">Enter your credentials to access your voter account.</p>
            </div>

            <form onSubmit={handleSubmit(onLogin)} noValidate className="space-y-4">
                <div>
                  <label htmlFor="email" className="label">Email address</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    {...register('email')}
                    className={`input-field ${errors.email ? 'input-error' : ''}`}
                    placeholder="you@example.com"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                  {errors.email && <p id="email-error" className="error-text">{errors.email.message}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="label mb-0">Password</label>
                    <button type="button" className="text-xs text-primary-600 hover:underline">
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    {...register('password')}
                    className={`input-field ${errors.password ? 'input-error' : ''}`}
                    placeholder="••••••••"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                  />
                  {errors.password && <p id="password-error" className="error-text">{errors.password.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-base"
                >
                  {loading ? <LoadingSpinner size="sm" color="white" label="Signing in..." /> : 'Sign In'}
                </button>
              </form>

            <p className="text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 font-semibold hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
