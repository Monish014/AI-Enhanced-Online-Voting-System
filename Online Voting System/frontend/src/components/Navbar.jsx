import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

const voterLinks = [
  { to: '/voter',              label: 'nav.dashboard' },
  { to: '/verify-vote',        label: 'nav.verifyVote' },
];

const adminLinks = [
  { to: '/admin',              label: 'nav.dashboard' },
  { to: '/admin/elections',    label: 'nav.elections' },
  { to: '/admin/voters',       label: 'nav.voters' },
  { to: '/admin/fraud-alerts', label: 'nav.fraudAlerts' },
  { to: '/admin/results',      label: 'nav.results' },
  { to: '/admin/audit-logs',   label: 'nav.auditLogs' },
];

export default function Navbar() {
  const { isAuthenticated, isAdmin, isVoter, user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const links = isAdmin ? adminLinks : isVoter ? voterLinks : [];

  const handleLogout = async () => {
    await logout();
    toast.info('You have been logged out.');
    navigate('/');
  };

  const toggleLang = (lng) => {
    i18n.changeLanguage(lng);
    setLangOpen(false);
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-150 ${
      isActive
        ? 'bg-primary-50 text-primary-700'
        : 'text-slate-600 hover:text-primary-600 hover:bg-slate-100'
    }`;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0" aria-label="VoteAI home">
          <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold" aria-hidden="true">V</span>
          </div>
          <span className="font-bold text-xl text-primary-800 hidden sm:block">VoteAI</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1" role="list">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/voter' || l.to === '/admin'} className={navLinkClass}>
              {t(l.label)}
            </NavLink>
          ))}
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-3">
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="btn-ghost text-xs font-medium px-2 py-1.5"
              aria-label="Change language"
              aria-haspopup="listbox"
              aria-expanded={langOpen}
            >
              🌐 {i18n.language?.toUpperCase().slice(0, 2)}
            </button>
            {langOpen && (
              <ul
                role="listbox"
                className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50 min-w-[120px]"
              >
                {[['en', 'English'], ['hi', 'हिंदी']].map(([code, label]) => (
                  <li key={code}>
                    <button
                      role="option"
                      aria-selected={i18n.language === code}
                      onClick={() => toggleLang(code)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-primary-50 hover:text-primary-700 transition-colors"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end leading-none">
                <span className="text-xs font-semibold text-slate-800">{user?.name}</span>
                <span className="text-xs text-slate-400 capitalize">{user?.role}</span>
              </div>
              <button onClick={handleLogout} className="btn-secondary text-sm px-4 py-2">
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login"    className="btn-ghost text-sm">{t('nav.login')}</Link>
              <Link to="/register" className="btn-primary text-sm px-4 py-2">{t('nav.register')}</Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden btn-ghost p-2"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <span className="sr-only">{menuOpen ? 'Close' : 'Open'} menu</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1 animate-fade-in"
          role="navigation"
          aria-label="Mobile navigation"
        >
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/voter' || l.to === '/admin'}
              className={navLinkClass}
              onClick={() => setMenuOpen(false)}
            >
              {t(l.label)}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
