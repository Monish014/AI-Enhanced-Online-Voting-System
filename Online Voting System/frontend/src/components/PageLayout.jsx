import React from 'react';
import Navbar from './Navbar';

export default function PageLayout({ children, className = '' }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main
        id="main-content"
        className={`flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}
        tabIndex={-1}
      >
        {children}
      </main>
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} VoteAI — Secure, Transparent, Accessible.
      </footer>
    </div>
  );
}
