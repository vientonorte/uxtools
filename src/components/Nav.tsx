import { NavLink } from 'react-router-dom';

interface NavProps {
  saveStatus?: 'saved' | 'unsaved' | null;
}

export function Nav({ saveStatus }: NavProps) {
  return (
    <nav aria-label="Navegación principal">
      <NavLink className="nav-brand" to="/" aria-label="UX Tools — Inicio">
        <div className="nav-logo" aria-hidden="true">UXT</div>
        <span className="nav-title">UX Tools</span>
        <span className="nav-badge">Suite</span>
      </NavLink>
      <div className="nav-actions">
        {saveStatus && (
          <span className={`nav-save-status${saveStatus === 'unsaved' ? ' unsaved' : ''}`}>
            {saveStatus === 'saved' ? '✓ Guardado' : '● Sin guardar'}
          </span>
        )}
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
    </nav>
  );
}
