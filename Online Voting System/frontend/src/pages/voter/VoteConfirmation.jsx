import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { toast } from 'react-toastify';
import PageLayout from '@components/PageLayout';

export default function VoteConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();

  const { blockHash, timestamp, electionTitle, candidateName } = location.state || {};

  // Redirect if arrived without state (e.g. direct URL visit)
  useEffect(() => {
    if (!blockHash) {
      navigate('/voter', { replace: true });
    }
  }, [blockHash]);

  if (!blockHash) return null;

  const formattedTime = new Date(timestamp).toLocaleString();

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(29, 78, 216);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('VoteAI', 20, 22);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Official Vote Receipt', 20, 32);

      // Body
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Vote Successfully Recorded', 20, 58);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);

      const rows = [
        ['Election',      electionTitle  || 'N/A'],
        ['Candidate',     candidateName  || 'N/A'],
        ['Recorded At',   formattedTime],
        ['Block Hash',    blockHash],
      ];

      let y = 70;
      rows.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 20, y);
        doc.setFont('helvetica', 'normal');
        if (label === 'Block Hash') {
          // Wrap long hash
          const lines = doc.splitTextToSize(value, pageWidth - 70);
          doc.text(lines, 70, y);
          y += lines.length * 7;
        } else {
          doc.text(String(value), 70, y);
          y += 10;
        }
      });

      // Verification note
      y += 6;
      doc.setFillColor(239, 246, 255);
      doc.rect(15, y, pageWidth - 30, 22, 'F');
      doc.setTextColor(30, 64, 175);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('How to verify:', 20, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Visit ${window.location.origin}/verify-vote and enter your Block Hash above.`,
        20, y + 14
      );

      // Footer
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text(
        `Generated on ${new Date().toLocaleString()} — VoteAI Secure Voting Platform`,
        20,
        doc.internal.pageSize.getHeight() - 10
      );

      doc.save(`VoteReceipt-${blockHash.slice(0, 8)}.pdf`);
      toast.success('Receipt downloaded!');
    } catch (err) {
      toast.error('Failed to generate PDF.');
    }
  };

  return (
    <PageLayout>
      <div className="max-w-lg mx-auto space-y-6 animate-slide-up">
        {/* Success banner */}
        <div className="text-center space-y-3 py-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-4xl" aria-hidden="true">
            ✅
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Vote Cast!</h1>
          <p className="text-slate-500 text-base">
            Your vote has been securely recorded on the immutable ledger.
          </p>
        </div>

        {/* Receipt card */}
        <div
          className="card border-green-200 bg-green-50 space-y-4"
          role="region"
          aria-label="Vote receipt"
        >
          <h2 className="section-title text-green-800 flex items-center gap-2">
            <span aria-hidden="true">🧾</span> Your Vote Receipt
          </h2>

          <dl className="space-y-3 text-sm">
            {[
              { label: 'Election',     value: electionTitle },
              { label: 'Candidate',    value: candidateName },
              { label: 'Recorded At',  value: formattedTime },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="font-medium text-slate-600 flex-shrink-0">{label}</dt>
                <dd className="text-slate-900 text-right">{value || '—'}</dd>
              </div>
            ))}

            <div className="pt-2 border-t border-green-200">
              <dt className="font-medium text-slate-600 mb-1.5">Block Hash</dt>
              <dd
                className="font-mono text-xs bg-white border border-green-200 rounded-lg p-3
                           break-all text-slate-800 select-all"
                aria-label="Your unique block hash"
                title="Copy this hash to verify your vote"
              >
                {blockHash}
              </dd>
              <p className="text-xs text-slate-400 mt-1">Click to select all — save this for vote verification.</p>
            </div>
          </dl>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={downloadPDF}
            className="btn-primary py-3 flex items-center justify-center gap-2"
            aria-label="Download vote receipt as PDF"
          >
            <span aria-hidden="true">📥</span> Download Receipt
          </button>
          <Link
            to="/verify-vote"
            state={{ prefillHash: blockHash }}
            className="btn-secondary py-3 flex items-center justify-center gap-2"
            aria-label="Verify your vote on the ledger"
          >
            <span aria-hidden="true">🔍</span> Verify My Vote
          </Link>
        </div>

        <Link to="/voter" className="btn-ghost w-full justify-center text-sm">
          ← Return to Dashboard
        </Link>

        {/* Info note */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800" role="note">
          <p className="font-semibold mb-1">🔒 Your ballot is secret</p>
          <p>
            The block hash proves your vote exists on the chain without revealing your choice.
            Even administrators cannot link your hash to your candidate.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
