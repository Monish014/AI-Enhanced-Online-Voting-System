import { useState, useEffect, useRef } from 'react';

/**
 * useCountdown
 * @param {Date|string} targetDate - when countdown expires
 * @returns { days, hours, minutes, seconds, isExpired }
 */
export default function useCountdown(targetDate) {
  const calcRemaining = () => {
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    return {
      days:      Math.floor(diff / 86_400_000),
      hours:     Math.floor((diff % 86_400_000) / 3_600_000),
      minutes:   Math.floor((diff % 3_600_000)  / 60_000),
      seconds:   Math.floor((diff % 60_000)     / 1_000),
      isExpired: false,
    };
  };

  const [remaining, setRemaining] = useState(calcRemaining);
  const timerRef = useRef(null);

  useEffect(() => {
    if (remaining.isExpired) return;
    timerRef.current = setInterval(() => setRemaining(calcRemaining()), 1000);
    return () => clearInterval(timerRef.current);
  }, [targetDate]);

  return remaining;
}
