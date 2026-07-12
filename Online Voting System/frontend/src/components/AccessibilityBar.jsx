import React, { useState, useEffect } from 'react';

/**
 * Accessibility toolbar: high-contrast toggle + text-to-speech for ballot reading.
 */
export default function AccessibilityBar({ textToSpeak = null }) {
  const [highContrast, setHighContrast] = useState(
    () => localStorage.getItem('highContrast') === 'true'
  );
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    localStorage.setItem('highContrast', highContrast);
  }, [highContrast]);

  const speak = () => {
    if (!textToSpeak || !window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utt = new SpeechSynthesisUtterance(textToSpeak);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utt);
  };

  return (
    <div
      className="flex items-center gap-3 flex-wrap"
      role="toolbar"
      aria-label="Accessibility options"
    >
      <button
        onClick={() => setHighContrast((v) => !v)}
        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
          highContrast
            ? 'bg-black text-white border-black'
            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
        }`}
        aria-pressed={highContrast}
        aria-label="Toggle high contrast mode"
      >
        ⬛ High Contrast
      </button>

      {textToSpeak && window.speechSynthesis && (
        <button
          onClick={speak}
          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            speaking
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
          aria-pressed={speaking}
          aria-label={speaking ? 'Stop reading aloud' : 'Read ballot aloud'}
        >
          🔊 {speaking ? 'Stop Reading' : 'Read Aloud'}
        </button>
      )}
    </div>
  );
}
