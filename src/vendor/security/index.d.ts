/**
 * @module types
 * Tipos base para el sistema de autenticación multi-factor del colectivo vientonorte.
 * Diseñado con modelo STRIDE (Spoofing, Tampering, Repudiation, Info disclosure,
 * Denial of service, Elevation of privilege).
 */
/** Tipos de factor de autenticación soportados */
type FactorType = 'password' | 'otp-sms' | 'otp-email' | 'totp' | 'passkey' | 'magic-link';
/**
 * Nivel de autenticación alcanzado en la sesión.
 * 0 = anónimo
 * 1 = contraseña válida
 * 2 = segundo factor (OTP / TOTP / magic-link)
 * 3 = factor de hardware (passkey / WebAuthn)
 */
type AuthLevel = 0 | 1 | 2 | 3;
/** Representa un factor de autenticación registrado y verificado */
interface AuthFactor {
    type: FactorType;
    level: AuthLevel;
    /** Etiqueta legible para UI (p.ej. "Teléfono terminado en 4821") */
    label: string;
    /** Cuándo fue verificado por última vez */
    verifiedAt?: Date;
    /** ID de dispositivo (hash, sin PII) para correlacionar sesiones */
    deviceId?: string;
}
/** Estado completo de la sesión autenticada */
interface SessionState {
    userId: string | null;
    factors: AuthFactor[];
    currentLevel: AuthLevel;
    sessionId: string;
    expiresAt: Date;
    lastActivityAt: Date;
}
/** Requisito de nivel mínimo para una operación sensible */
interface FactorRequirement {
    minLevel: AuthLevel;
    /** Descripción legible del motivo (para UI de step-up) */
    reason: string;
    /** Si se especifica, solo estos tipos de factor son aceptables */
    allowedFactors?: FactorType[];
}
/** Resultado de un intento de step-up auth */
type StepUpResult = {
    success: true;
    newLevel: AuthLevel;
} | {
    success: false;
    required: FactorRequirement;
    currentLevel: AuthLevel;
};

/**
 * @module FactorRegistry
 * Registro central de factores de autenticación (patrón Microsoft Identity).
 * Mantiene el mapa de factores verificados para la sesión activa.
 */

/**
 * Registro de factores de autenticación verificados.
 * Un FactorRegistry representa lo que el usuario HA PROBADO en esta sesión,
 * no lo que podría probar.
 *
 * @example
 * const registry = new FactorRegistry();
 * registry.register({ type: 'password', level: 1, label: 'Contraseña', verifiedAt: new Date() });
 * registry.register({ type: 'totp', level: 2, label: 'Google Authenticator', verifiedAt: new Date() });
 * console.log(registry.getHighestLevel()); // 2
 */
declare class FactorRegistry {
    private factors;
    /**
     * Registra un factor verificado. Si el tipo ya existe, lo sobreescribe
     * (permite re-verificación con `verifiedAt` actualizado).
     */
    register(factor: AuthFactor): void;
    /**
     * Elimina un factor del registro (p.ej. al revocar un dispositivo).
     */
    unregister(type: FactorType): void;
    /**
     * Obtiene un factor específico por tipo.
     * @returns AuthFactor o undefined si no está registrado
     */
    get(type: FactorType): AuthFactor | undefined;
    /**
     * Retorna todos los factores registrados ordenados por nivel descendente.
     */
    getAll(): AuthFactor[];
    /**
     * Nivel máximo de autenticación alcanzado según los factores registrados.
     * @returns AuthLevel (0 si no hay factores)
     */
    getHighestLevel(): AuthLevel;
    /**
     * Comprueba si el registry incluye al menos un factor con el nivel indicado.
     */
    hasLevel(level: AuthLevel): boolean;
    /**
     * Serializa el registry para persistencia.
     * Nota: `verifiedAt` se convierte a ISO string. No incluye datos sensibles.
     */
    toJSON(): Record<string, unknown>;
    /**
     * Restaura un FactorRegistry desde datos serializados (p.ej. sessionStorage).
     *
     * @example
     * const raw = JSON.parse(sessionStorage.getItem('vn_registry') ?? '{}');
     * const registry = FactorRegistry.fromJSON(raw);
     */
    static fromJSON(data: Record<string, unknown>): FactorRegistry;
}

/**
 * @module SessionManager
 * Gestión de sesión autenticada con timeout de inactividad y step-up auth.
 *
 * Almacena en sessionStorage (no localStorage) para limitar el scope a la
 * pestaña activa — decisión de seguridad: reduce superficie de ataque XSS.
 */

/**
 * Gestiona el estado de sesión autenticada.
 *
 * @example
 * const session = new SessionManager({ timeoutMs: 15 * 60 * 1000 });
 * session.updateActivity();
 *
 * const result = session.requireLevel(
 *   { minLevel: 2, reason: 'Operación de retiro requiere 2FA' },
 *   registry
 * );
 * if (!result.success) showStepUpDialog(result.required);
 */
declare class SessionManager {
    private state;
    private readonly timeoutMs;
    constructor(options?: {
        timeoutMs?: number;
    });
    /** Retorna una copia readonly del estado actual */
    getState(): Readonly<SessionState>;
    /**
     * Actualiza el timestamp de última actividad y extiende la expiración.
     * Llamar en cada interacción del usuario (click, navegación, API call).
     */
    updateActivity(): void;
    /**
     * Comprueba si la sesión ha expirado por inactividad.
     */
    isExpired(): boolean;
    /**
     * Verifica si el registry satisface el requisito de nivel.
     * Si no, retorna `success: false` con los datos para mostrar el diálogo de step-up.
     *
     * @param requirement - Nivel mínimo y motivo requerido
     * @param registry - FactorRegistry con los factores verificados en sesión
     * @returns StepUpResult
     *
     * @example
     * const result = session.requireLevel(
     *   { minLevel: 2, reason: 'Ver número de cuenta completo' },
     *   registry
     * );
     * if (result.success) proceedWithSensitiveOp();
     * else showStepUpPrompt(result.required);
     */
    requireLevel(requirement: FactorRequirement, registry: FactorRegistry): StepUpResult;
    /**
     * Genera un device fingerprint básico sin PII.
     * Solo para correlacionar sesiones del mismo dispositivo, no para tracking.
     */
    private generateDeviceId;
    /** Genera un sessionId único */
    private generateSessionId;
    /**
     * Persiste el estado en sessionStorage (no localStorage — decisión de seguridad).
     * No persiste datos sensibles como tokens o contraseñas.
     */
    save(): void;
    /**
     * Restaura una sesión desde sessionStorage.
     * Retorna null si no hay sesión guardada o está expirada.
     *
     * @example
     * const session = SessionManager.restore() ?? new SessionManager();
     */
    static restore(): SessionManager | null;
    /**
     * Limpia la sesión de sessionStorage y resetea el estado.
     */
    clear(): void;
}

/**
 * @module requireFactor
 * Helper funcional (sin clase) para step-up auth.
 * API alternativa a SessionManager.requireLevel() para uso en middleware
 * o funciones de servidor donde no se quiere instanciar la clase completa.
 */

/**
 * Verifica que la sesión tenga el nivel requerido para una operación sensible.
 * Wrapper funcional sobre SessionManager.requireLevel().
 *
 * @param level - Nivel mínimo de autenticación requerido
 * @param reason - Motivo legible para mostrar al usuario en el diálogo de step-up
 * @param registry - FactorRegistry con los factores verificados
 * @param session - SessionManager de la sesión activa
 * @returns StepUpResult — éxito o datos para mostrar step-up UI
 *
 * @example
 * // Antes de mostrar número de cuenta completo:
 * const result = requireFactor(2, 'Ver datos sensibles', registry, session);
 * if (!result.success) {
 *   showStepUpDialog(result.required);
 *   return;
 * }
 * revealAccountNumber();
 *
 * @example
 * // Solo passkey para transferencias:
 * const result = requireFactor(
 *   3,
 *   'Transferir fondos requiere passkey',
 *   registry,
 *   session
 * );
 */
declare function requireFactor(level: AuthLevel, reason: string, registry: FactorRegistry, session: SessionManager): StepUpResult;

/**
 * @module cspHeaders
 * Content Security Policy helpers para proyectos vientonorte.
 * Optimizado para GitHub Pages (sin servidor, solo meta tag CSP).
 *
 * NOTA: meta tag CSP no soporta `frame-ancestors` ni `report-uri` — usar
 * solo en SPAs donde no hay control del servidor de origen.
 */
interface CSPConfig {
    defaultSrc?: string[];
    scriptSrc?: string[];
    styleSrc?: string[];
    imgSrc?: string[];
    connectSrc?: string[];
    fontSrc?: string[];
    frameSrc?: string[];
    /** Solo efectivo en CSP entregado via header HTTP, no meta tag */
    reportUri?: string;
}
/**
 * Construye un string CSP a partir de la configuración.
 * Los arrays de fuentes se unen con espacios; las directivas se separan con `;`.
 *
 * @param config - Directivas CSP
 * @returns String listo para usar en Content-Security-Policy header o meta tag
 *
 * @example
 * const csp = buildCSP({
 *   defaultSrc: ["'self'"],
 *   scriptSrc: ["'self'", "'unsafe-inline'"],
 *   imgSrc: ["'self'", 'data:', 'https:'],
 * });
 * // "default-src 'self'; script-src 'self' 'unsafe-inline'; img-src 'self' data: https:"
 */
declare function buildCSP(config: CSPConfig): string;
/**
 * Inyecta un meta tag CSP en el `<head>` del documento.
 * Útil en SPAs sin control del servidor (GitHub Pages, Netlify redirects, etc.).
 *
 * Limitaciones del meta tag CSP:
 * - No soporta `frame-ancestors`
 * - No soporta `report-uri` / `report-to`
 * - Debe ser el primer elemento de `<head>` para ser efectivo
 *
 * @param config - Configuración CSP
 *
 * @example
 * // En el entry point de la SPA, antes de cualquier renderizado:
 * import { injectCSPMeta, vientonorteCSP } from '@vientonorte/security';
 * injectCSPMeta(vientonorteCSP);
 */
declare function injectCSPMeta(config: CSPConfig): void;
/**
 * Preset CSP seguro para proyectos vientonorte desplegados en GitHub Pages.
 *
 * Permite:
 * - Scripts propios + GitHub Pages CDN
 * - Estilos propios + inline (necesario para CSS-in-JS / tokens CSS vars)
 * - Imágenes: self, data URIs, HTTPS (avatares externos, shields.io, etc.)
 * - Conexiones: self + Supabase (configurar URL real en producción)
 * - Fuentes: self + Google Fonts
 *
 * Ajustar `connectSrc` con la URL de Supabase del proyecto antes de usar.
 *
 * @example
 * import { injectCSPMeta, vientonorteCSP } from '@vientonorte/security';
 *
 * injectCSPMeta({
 *   ...vientonorteCSP,
 *   connectSrc: [
 *     ...vientonorteCSP.connectSrc!,
 *     'https://tu-proyecto.supabase.co',
 *   ],
 * });
 */
declare const vientonorteCSP: CSPConfig;

export { type AuthFactor, type AuthLevel, type CSPConfig, FactorRegistry, type FactorRequirement, type FactorType, SessionManager, type SessionState, type StepUpResult, buildCSP, injectCSPMeta, requireFactor, vientonorteCSP };
