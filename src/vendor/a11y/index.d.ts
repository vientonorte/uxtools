import React, { RefObject } from 'react';

/**
 * @module useFocusTrap
 * Focus trap para modales, drawers y dialogs.
 * WCAG 2.2 AA — Focus Order (2.4.3), No Keyboard Trap (2.1.2 — la trampa es intencional
 * y el usuario puede salir con Escape via el componente padre).
 */

interface FocusTrap {
    /** Activa la trampa: redirige Tab/Shift+Tab al interior del contenedor */
    activate(): void;
    /** Desactiva la trampa y restaura el foco al elemento que lo tenía antes */
    deactivate(): void;
}
/**
 * Crea un focus trap vanilla (sin React) para un contenedor dado.
 * Útil en proyectos sin framework o en web components.
 *
 * @param element - Contenedor que encierra el foco
 * @returns { activate, deactivate }
 *
 * @example
 * const trap = createFocusTrap(document.querySelector('#modal'));
 * trap.activate();
 * // … al cerrar:
 * trap.deactivate();
 */
declare function createFocusTrap(element: HTMLElement): FocusTrap;
/**
 * Hook React que aplica un focus trap a un ref de contenedor.
 * Se activa/desactiva automáticamente con el flag `active`.
 *
 * @param ref - RefObject del contenedor (p.ej. ref de un dialog)
 * @param active - true = trampa activa, false = trampa desactivada
 *
 * @example
 * const ref = useRef<HTMLDivElement>(null);
 * useFocusTrap(ref, isOpen);
 * return <div ref={ref}>{children}</div>;
 */
declare function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean): void;

/**
 * @module useLiveRegion
 * Hook React para anunciar mensajes dinámicos a tecnologías asistivas.
 * WCAG 2.2 AA — Status Messages (4.1.3)
 */
/** Politeness level del aria-live region */
type Politeness = 'polite' | 'assertive';
/**
 * Crea un aria-live region dinámico y retorna una función `announce`
 * para inyectar mensajes que serán leídos por screen readers.
 *
 * El delay de 100 ms fuerza que el DOM cambie aunque el mensaje sea igual
 * al anterior, garantizando que el SR lo re-anuncie.
 *
 * @param politeness - 'polite' (default) espera silencio; 'assertive' interrumpe
 * @returns `announce(message: string)` — función para disparar anuncios
 *
 * @example
 * const announce = useLiveRegion('polite');
 * announce('Archivo cargado correctamente');
 */
declare function useLiveRegion(politeness?: Politeness): (message: string) => void;

/**
 * @module useAnnouncer
 * Versión simplificada de useLiveRegion para mensajes de estado transitorios.
 * WCAG 2.2 AA — Status Messages (4.1.3)
 */
interface AnnouncerControls {
    /** Anuncia un mensaje a tecnologías asistivas */
    announce(message: string): void;
    /** Limpia el contenido del live region (sin anuncio) */
    clear(): void;
}
/**
 * Hook simplificado para anuncios de estado.
 * Usa politeness 'polite' por defecto.
 *
 * @returns { announce, clear }
 *
 * @example
 * const { announce, clear } = useAnnouncer();
 *
 * // Al guardar:
 * announce('Cambios guardados');
 *
 * // Al desmontar o navegar:
 * clear();
 */
declare function useAnnouncer(): AnnouncerControls;

/**
 * @module SkipLink
 * Enlace de salto al contenido principal — WCAG 2.2 AA Bypass Blocks (2.4.1)
 *
 * Aparece solo al recibir foco (visible para usuarios de teclado).
 * Usa la clase `.vn-skip-link` que debe definirse en tokens/globals.css.
 */

interface SkipLinkProps {
    /** ID o hash del elemento de destino, p.ej. "#main" o "#contenido-principal" */
    href?: string;
    /** Texto del enlace. Default: "Saltar al contenido principal" */
    label?: string;
}
/**
 * Enlace de salto visible solo al recibir foco.
 * Posicionar como primer elemento del <body> para máxima compatibilidad.
 *
 * @example
 * // En el layout raíz:
 * <SkipLink href="#main" />
 * <header>…</header>
 * <main id="main">…</main>
 *
 * @example
 * // Con label personalizado:
 * <SkipLink href="#nav-principal" label="Saltar al menú" />
 */
declare function SkipLink({ href, label, }: SkipLinkProps): React.JSX.Element;

/**
 * @module focusable
 * Utilidades para detectar y obtener elementos focusables.
 * WCAG 2.2 AA — Focus Order (2.4.3), Focus Visible (2.4.11)
 */
/**
 * Retorna todos los elementos focusables dentro de un contenedor,
 * ordenados por tabindex natural del DOM.
 *
 * @param container - El elemento raíz donde buscar
 * @returns Array de HTMLElement focusables visibles y no ocultos
 *
 * @example
 * const focusables = getFocusableElements(dialogRef.current);
 * focusables[0].focus();
 */
declare function getFocusableElements(container: HTMLElement): HTMLElement[];
/**
 * Determina si un elemento es focusable (visible, no oculto, no inert).
 *
 * @param el - Elemento a evaluar
 * @returns true si el elemento puede recibir foco
 *
 * @example
 * if (isFocusable(buttonEl)) buttonEl.focus();
 */
declare function isFocusable(el: HTMLElement): boolean;

export { type AnnouncerControls, type FocusTrap, SkipLink, type SkipLinkProps, createFocusTrap, getFocusableElements, isFocusable, useAnnouncer, useFocusTrap, useLiveRegion };
