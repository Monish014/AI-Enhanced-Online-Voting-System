import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import voteService from '@services/voteService';
import PageLayout from '@components/PageLayout';
import LoadingSpinner from '@components/LoadingSpinner';

const schema = yup.object({
  blockHash: yup.string()
    .required('Block hash is required')
    .length(64, 'Block hash must be exactly 64 characters')
    .matches(/^[a-f0-9]+$/, 'Block hash must contain only hex characters'),
});

export default function VoteVerifyPage() {
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(schema),
  });

  const onVerify = async ({ blockHash }) => {
    setLoading(true);
    setResult(null);
    try {
      const data = await voteService.verifyByHash(blockHash);
      setResult({ verified: data.data.verified, ...data.data });
    } catch (err) {
      setResult({ verified: false, error: err.response?.data?.message || 'Verification failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-xl mx-auto space-y-8 animate-slide-up">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto text-3xl" aria-hidden="true">
            🔍
          </div>
          <h1 className="page-title">Verify Your Vote</h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto">
            Enter your block hash receipt to confirm your vote was recorded on the ledger.
            This does <strong>not</strong> reveal who you voted for.
          </p>
        </div>

        {/* How it works info card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1" role="note">
          <p className="font-semibold">ℹ️ About Vote Verification</p>
          <p>Your block hash is a unique cryptographic fingerprint of your vote. It proves your vote exists on the chain without exposing your choice — preserving ballot secrecy.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onVerify)} className="card space-y-4" noValidate>
          <div>
            <label htmlFor="blockHash" className="label">Block Hash</label>
            <input
              id="blockHash"
              type="text"
              {...register('blockHash')}
              placeholder="Enter your 64-character hex block hash..."
              className={`input-field font-mono text-sm ${errors.blockHash ? 'input-error' : ''}`}
              aria-invalid={!!errors.blockHash}
              aria-describedby={errors.blockHash ? 'hash-error' : undefined}
              spellCheck={false}
              autoComplete="off"
            />
            {errors.blockHash && (
              <p id="hash-error" className="error-text">{errors.blockHash.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? <LoadingSpinner size="sm" color="white" label="Verifying..." /> : 'Verify Vote'}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div
            role="alert"
            aria-live="assertive"
            className={`rounded-xl p-6 space-y-3 animate-slide-up ${
              result.verified
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">
                {result.verified ? '✅' : '❌'}
              </span>
              <div>
                <p className={`font-bold text-lg ${result.verified ? 'text-green-800' : 'text-red-800'}`}>
                  {result.verified ? 'Vote Verified!' : 'Vote Not Found'}
                </p>
                <p className={`text-sm ${result.verified ? 'text-green-700' : 'text-red-700'}`}>
                  {result.verified
                    ? 'Your vote is confirmed on the immutable ledger.'
                    : result.error || 'No record found for this block hash.'}
                </p>
              </div>
            </div>

            {result.verified && result.timestamp && (
              <dl className="text-sm space-y-1 pt-2 border-t border-green-200">
                <div className="flex justify-between">
                  <dt className="text-green-700 font-medium">Recorded at</dt>
                  <dd className="text-green-900 font-mono text-xs">
                    {new Date(result.timestamp).toLocaleString()}
                  </dd>
                </div>
              </dl>
            )}

            <button
              onClick={() => { setResult(null); reset(); }}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
            >
              Verify another hash
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
