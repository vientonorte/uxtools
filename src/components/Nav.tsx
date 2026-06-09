import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';

interface NavProps {
  saveStatus?: 'saved' | 'unsaved' | null;
}

export function Nav({ saveStatus }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && menuOpen) setMenuOpen(false);
    }
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <nav aria-label="Navegación principal">
      <NavLink className="nav-brand" to="/" aria-label="UX Tools — Inicio" onClick={close}>
        <div className="nav-logo" aria-hidden="true">UXT</div>
        <span className="nav-title">UX Tools</span>
        <span className="nav-badge">Suite</span>
      </NavLink>

      {/* Desktop nav links */}
      <div className="nav-actions">
        {saveStatus && (
          <span className={`nav-save-status${saveStatus === 'unsaved' ? ' unsaved' : ''}`}>
            {saveStatus === 'saved' ? '✓ Guardado' : '● Sin guardar'}
          </span>
        )}
        <NavLink
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          to="/medicinal"
        >
          🌿 ID Medicinal
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `nav-link nav-link-admin${isActive ? ' active' : ''}`
          }
          to="/admin"
        >
          ⚙ Admin
        </NavLink>
        <a
          className="nav-link"
          href="https://vientonorte.github.io/"
          target="_blank"
          rel="noopener noreferrer"
        >
          ← vientonorte
        </a>
        <a
          className="btn-nav"
          href="https://github.com/vientonorte/uxtools"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </div>

      {/* Mobile hamburger + dropdown */}
      <div className="nav-mobile-wrap" ref={wrapRef}>
        <button
          className={`nav-hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="nav-mobile-menu"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú de navegación'}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>

        {menuOpen && (
          <div
            id="nav-mobile-menu"
            className="nav-mobile-menu"
            role="navigation"
            aria-label="Menú de navegación"
          >
            <NavLink className={({ isActive }) => `nav-mobile-link${isActive ? ' active' : ''}`} to="/" onClick={close} end>
              Dashboard
            </NavLink>
            <NavLink className={({ isActive }) => `nav-mobile-link${isActive ? ' active' : ''}`} to="/medicinal" onClick={close}>
              🌿 ID Medicinal
            </NavLink>
            <NavLink className={({ isActive }) => `nav-mobile-link${isActive ? ' active' : ''}`} to="/benchmark" onClick={close}>
              UX Benchmark
            </NavLink>
            <NavLink className={({ isActive }) => `nav-mobile-link${isActive ? ' active' : ''}`} to="/uxflow" onClick={close}>
              UXFLOW
            </NavLink>
            <NavLink className={({ isActive }) => `nav-mobile-link${isActive ? ' active' : ''}`} to="/brief" onClick={close}>
              Brief
            </NavLink>
            <NavLink className={({ isActive }) => `nav-mobile-link nav-link-admin${isActive ? ' active' : ''}`} to="/admin" onClick={close}>
              ⚙ Admin
            </NavLink>
            <div className="nav-mobile-divider" aria-hidden="true" />
            <a className="nav-mobile-link" href="https://vientonorte.github.io/" target="_blank" rel="noopener noreferrer" onClick={close}>
              ← vientonorte
            </a>
            <a className="nav-mobile-link" href="https://github.com/vientonorte/uxtools" target="_blank" rel="noopener noreferrer" onClick={close}>
              GitHub ↗
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
