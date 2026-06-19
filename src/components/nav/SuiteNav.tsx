import { NavLink, useLocation } from 'react-router-dom';
import {
  EXTERNAL_LINKS,
  NAV_MODULE_LINKS,
  SUITE_MODULES,
  getModuleById,
  type SuiteModule,
  type SuiteModuleId,
} from '../../config/suiteNav';
import { useNavMenu } from '../../hooks/useNavMenu';

interface SuiteNavProps {
  saveStatus?: 'saved' | 'unsaved' | null;
}

function pathnameToModule(pathname: string): SuiteModuleId {
  if (pathname.startsWith('/benchmark')) return 'benchmark';
  if (pathname.startsWith('/uxflow')) return 'uxflow';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/brief')) return 'brief';
  return 'suite';
}

function moduleHref(module: SuiteModule): string {
  return module.spaPath ?? module.staticPath ?? 'index.html';
}

function NavModuleLink({
  module,
  activeModule,
  className,
  onNavigate,
}: {
  module: SuiteModule;
  activeModule: SuiteModuleId;
  className: string;
  onNavigate?: () => void;
}) {
  const active = module.id === activeModule;
  const linkClass = `${className}${active ? ' active' : ''}${module.variant === 'admin' ? ' nav-link-admin' : ''}`;

  if (module.spaPath) {
    return (
      <NavLink
        className={linkClass}
        to={module.spaPath}
        aria-current={active ? 'page' : undefined}
        onClick={onNavigate}
      >
        {module.variant === 'admin' ? '⚙ ' : ''}
        {module.shortLabel}
      </NavLink>
    );
  }

  return (
    <a
      className={linkClass}
      href={module.staticPath}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
    >
      {module.shortLabel}
    </a>
  );
}

export function SuiteNav({ saveStatus = null }: SuiteNavProps) {
  const { pathname } = useLocation();
  const activeModule = pathnameToModule(pathname);
  const module = getModuleById(activeModule);
  const { open, menuId, buttonRef, panelRef, close, toggle } = useNavMenu();

  return (
    <nav className="suite-nav" aria-label="Navegación principal">
      <NavLink className="nav-brand" to="/" aria-label={`${module.label} — Inicio`}>
        <div className="nav-logo" aria-hidden="true">{module.logo}</div>
        <span className="nav-title">{module.label}</span>
        {module.badge && <span className="nav-badge">{module.badge}</span>}
      </NavLink>

      <div className="nav-modules-desktop" role="list" aria-label="Módulos de la suite">
        {NAV_MODULE_LINKS.map((item) => (
          <span key={item.id} role="listitem">
            <NavModuleLink module={item} activeModule={activeModule} className="nav-link" />
          </span>
        ))}
      </div>

      <div className="nav-actions">
        {saveStatus && (
          <span
            className={`nav-save-status${saveStatus === 'unsaved' ? ' unsaved' : ''}`}
            role="status"
            aria-live="polite"
          >
            {saveStatus === 'saved' ? '✓ Guardado' : '● Sin guardar'}
          </span>
        )}

        <a className="nav-link nav-link-utility" href={EXTERNAL_LINKS.vientonorte} rel="noopener noreferrer">
          ← vientonorte
        </a>
        <a className="btn-nav" href={EXTERNAL_LINKS.github} rel="noopener noreferrer">
          GitHub
        </a>

        <button
          ref={buttonRef}
          type="button"
          className="nav-menu-btn"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? 'Cerrar menú de módulos' : 'Abrir menú de módulos'}
          onClick={toggle}
        >
          <span className="nav-menu-icon" aria-hidden="true" />
          <span className="nav-menu-label">Módulos</span>
        </button>
      </div>

      <div
        ref={panelRef}
        id={menuId}
        className="nav-drawer"
        hidden={!open}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de módulos UX Tools"
      >
        <button type="button" className="nav-drawer-backdrop" aria-label="Cerrar menú" onClick={close} />
        <div className="nav-drawer-panel">
          <div className="nav-drawer-header">
            <span className="nav-drawer-title">UX Tools Suite</span>
            <button type="button" className="nav-drawer-close" onClick={close}>
              Cerrar
            </button>
          </div>
          <ul className="nav-drawer-list">
            {SUITE_MODULES.map((item) => {
              const active = item.id === activeModule;
              return (
                <li key={item.id}>
                  {item.spaPath ? (
                    <NavLink
                      className={`nav-drawer-link${active ? ' active' : ''}`}
                      to={item.spaPath}
                      aria-current={active ? 'page' : undefined}
                      onClick={close}
                    >
                      <span className="nav-drawer-link-logo" aria-hidden="true">{item.logo}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  ) : (
                    <a
                      className={`nav-drawer-link${active ? ' active' : ''}`}
                      href={item.staticPath}
                      aria-current={active ? 'page' : undefined}
                      onClick={close}
                    >
                      <span className="nav-drawer-link-logo" aria-hidden="true">{item.logo}</span>
                      <span>{item.label}</span>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="nav-drawer-footer">
            <a className="nav-drawer-utility" href={EXTERNAL_LINKS.vientonorte} rel="noopener noreferrer" onClick={close}>
              ← vientonorte
            </a>
            <a className="nav-drawer-utility" href={EXTERNAL_LINKS.github} rel="noopener noreferrer" onClick={close}>
              GitHub
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}