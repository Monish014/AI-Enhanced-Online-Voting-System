import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import electionService from '@services/electionService';
import voteService from '@services/voteService';
import PageLayout from '@components/PageLayout';
import LoadingSpinner from '@components/LoadingSpinner';
import ConfirmModal from '@components/ConfirmModal';
import AccessibilityBar from '@components/AccessibilityBar';
import useCountdown from '@hooks/useCountdown';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

export default function VotingBooth() {
  const { electionId } = useParams();
  const location       = useNavigate() && useLocation();
  const navigate       = useNavigate();

  const [election,  setElection]  = useState(null);
  const [candidates,setCandidates]= useState([]);
  const [selected,  setSelected]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [submitting,setSubmitting]= useState(false);
  const [confirm,   setConfirm]   = useState(false);
  const [pageLoadTime] = useState(new Date().toISOString());

  const faceToken = location.state?.faceToken || sessionStorage.getItem('faceToken');
  const electionTitle = location.state?.electionTitle;

  useEffect(() => {
    if (!faceToken) {
      toast.warning('Face verification required before voting.');
      navigate('/voter', { replace: true });
      return;
    }
    loadElection();
  }, [electionId]);

  const loadElection = async () => {
    try {
      const [electionData, candidatesData] = await Promise.all([
        electionService.getById(electionId),
        electionService.getCandidates(electionId),
      ]);
      setElection(electionData);
      setCandidates(candidatesData || []);
    } catch (err) {
      toast.error('Failed to load election details.');
      navigate('/voter');
    } finally {
      setLoading(false);
    }
  };

  const { hours, minutes, seconds, isExpired } = useCountdown(election?.endTime);

  // Build ballot text for TTS
  const ballotText = candidates.length > 0
    ? `Ballot for ${election?.title}. ${candidates.map((c, i) => `Candidate ${i + 1}: ${c.name} from ${c.party || 'Independent'}.`).join(' ')}`
    : '';

  const handleVoteConfirm = async () => {
    if (!selected) return;
    setConfirm(false);
    setSubmitting(true);

    const deviceFingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
    ].join('|');

    try {
      const data = await voteService.castVote({
        electionId,
        candidateId: selected,
        deviceFingerprint,
        pageLoadTime,
        livenessFlag: true,
      });

      sessionStorage.removeItem('faceToken');

      toast.success('Vote cast successfully!');
      navigate('/voter/confirmation', {
        replace: true,
        state: {
          blockHash:     data.data.blockHash,
          timestamp:     data.data.timestamp,
          electionTitle: election?.title,
          candidateName: candidates.find((c) => c._id === selected)?.name,
        },
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to cast vote.';
      toast.error(msg);
      if (err.response?.status === 409) {
        navigate('/voter');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      </PageLayout>
    );
  }

  const selectedCandidate = candidates.find((c) => c._id === selected);

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="page-title">{election?.title}</h1>
            {!isExpired && (
              <div
                className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${
                  hours === 0 && minutes < 10
                    ? 'bg-red-100 text-red-700 animate-pulse'
                    : 'bg-amber-50 text-amber-700'
                }`}
                role="timer"
                aria-label="Time remaining to vote"
                aria-live="off"
              >
                ⏱ {String(hours).padStart(2,'0')}:{String(minutes).padStart(2,'0')}:{String(seconds).padStart(2,'0')} remaining
              </div>
            )}
          </div>
          <AccessibilityBar textToSpeak={ballotText} />
        </div>

        {isExpired && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm font-medium" role="alert">
            ⏰ This election has ended. Voting is no longer available.
          </div>
        )}

        {/* Candidates */}
        <fieldset disabled={isExpired || submitting}>
          <legend className="section-title mb-4">
            Select your candidate <span className="text-slate-400 font-normal text-sm">({candidates.length} candidates)</span>
          </legend>

          <div className="space-y-3" role="radiogroup" aria-label="Candidate selection">
            {candidates.map((candidate) => {
              const isSelected = selected === candidate._id;
              return (
                <label
                  key={candidate._id}
                  htmlFor={`candidate-${candidate._id}`}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                    ${isSelected
                      ? 'border-primary-500 bg-primary-50 shadow-sm shadow-primary-100'
                      : 'border-slate-200 bg-white hover:border-primary-200 hover:bg-slate-50'
                    }`}
                  aria-pressed={isSelected}
                >
                  <input
                    type="radio"
                    id={`candidate-${candidate._id}`}
                    name="candidate"
                    value={candidate._id}
                    checked={isSelected}
                    onChange={() => setSelected(candidate._id)}
                    className="sr-only"
                    aria-label={`Vote for ${candidate.name}`}
                  />

                  {/* Photo */}
                  <div className="w-14 h-14 flex-shrink-0">
                    {candidate.imageUrl ? (
                      <img
                        src={`${API_BASE}${candidate.imageUrl}`}
                        alt={`${candidate.name}'s photo`}
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-slate-200 rounded-xl flex items-center justify-center text-xl" aria-hidden="true">
                        👤
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{candidate.name}</p>
                    <p className="text-sm text-slate-500">{candidate.party || 'Independent'}</p>
                    {candidate.symbol && (
                      <p className="text-xs text-slate-400">Symbol: {candidate.symbol}</p>
                    )}
                    {candidate.bio && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{candidate.bio}</p>
                    )}
                  </div>

                  {/* Selection indicator */}
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-primary-500 bg-primary-500' : 'border-slate-300'
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586l-3.293-3.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" />
                      </svg>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Submit */}
        <div className="flex gap-3">
          <button onClick={() => navigate('/voter')} className="btn-secondary flex-none px-5">
            ← Back
          </button>
          <button
            onClick={() => setConfirm(true)}
            disabled={!selected || isExpired || submitting}
            className="btn-primary flex-1 py-3 text-base"
            aria-label={selected ? `Submit vote for ${selectedCandidate?.name}` : 'Select a candidate to vote'}
          >
            {submitting
              ? <LoadingSpinner size="sm" color="white" label="Submitting..." />
              : 'Cast My Vote →'}
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center" role="note">
          Your vote is anonymous and encrypted. You cannot change it after submission.
        </p>
      </div>

      {/* Confirmation modal */}
      <ConfirmModal
        open={confirm}
        title="Confirm Your Vote"
        confirmLabel="Yes, Cast My Vote"
        cancelLabel="Review Again"
        confirmClass="btn-primary bg-green-600 hover:bg-green-700"
        onConfirm={handleVoteConfirm}
        onCancel={() => setConfirm(false)}
      >
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <p className="text-sm text-slate-600">You are voting for:</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-xl" aria-hidden="true">
              👤
            </div>
            <div>
              <p className="font-bold text-slate-900">{selectedCandidate?.name}</p>
              <p className="text-sm text-slate-500">{selectedCandidate?.party || 'Independent'}</p>
            </div>
          </div>
          <p className="text-xs text-red-600 font-medium pt-1">
            ⚠️ This action is irreversible. You can only vote once.
          </p>
        </div>
      </ConfirmModal>
    </PageLayout>
  );
}
