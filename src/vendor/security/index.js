// src/FactorRegistry.ts
var FactorRegistry = class _FactorRegistry {
  factors = /* @__PURE__ */ new Map();
  /**
   * Registra un factor verificado. Si el tipo ya existe, lo sobreescribe
   * (permite re-verificación con `verifiedAt` actualizado).
   */
  register(factor) {
    this.factors.set(factor.type, factor);
  }
  /**
   * Elimina un factor del registro (p.ej. al revocar un dispositivo).
   */
  unregister(type) {
    this.factors.delete(type);
  }
  /**
   * Obtiene un factor específico por tipo.
   * @returns AuthFactor o undefined si no está registrado
   */
  get(type) {
    return this.factors.get(type);
  }
  /**
   * Retorna todos los factores registrados ordenados por nivel descendente.
   */
  getAll() {
    return Array.from(this.factors.values()).sort((a, b) => b.level - a.level);
  }
  /**
   * Nivel máximo de autenticación alcanzado según los factores registrados.
   * @returns AuthLevel (0 si no hay factores)
   */
  getHighestLevel() {
    if (this.factors.size === 0) return 0;
    return Math.max(...Array.from(this.factors.values()).map((f) => f.level));
  }
  /**
   * Comprueba si el registry incluye al menos un factor con el nivel indicado.
   */
  hasLevel(level) {
    return Array.from(this.factors.values()).some((f) => f.level >= level);
  }
  /**
   * Serializa el registry para persistencia.
   * Nota: `verifiedAt` se convierte a ISO string. No incluye datos sensibles.
   */
  toJSON() {
    var _a;
    const entries = {};
    for (const [type, factor] of this.factors.entries()) {
      entries[type] = {
        ...factor,
        verifiedAt: (_a = factor.verifiedAt) == null ? void 0 : _a.toISOString()
      };
    }
    return { factors: entries };
  }
  /**
   * Restaura un FactorRegistry desde datos serializados (p.ej. sessionStorage).
   *
   * @example
   * const raw = JSON.parse(sessionStorage.getItem('vn_registry') ?? '{}');
   * const registry = FactorRegistry.fromJSON(raw);
   */
  static fromJSON(data) {
    const registry = new _FactorRegistry();
    const factors = data["factors"];
    if (!factors) return registry;
    for (const raw of Object.values(factors)) {
      const factor = {
        type: raw["type"],
        level: raw["level"],
        label: raw["label"],
        verifiedAt: raw["verifiedAt"] ? new Date(raw["verifiedAt"]) : void 0,
        deviceId: raw["deviceId"]
      };
      registry.register(factor);
    }
    return registry;
  }
};

// src/SessionManager.ts
var STORAGE_KEY = "vn_session";
var DEFAULT_TIMEOUT_MS = 30 * 60 * 1e3;
var SessionManager = class _SessionManager {
  state;
  timeoutMs;
  constructor(options) {
    this.timeoutMs = (options == null ? void 0 : options.timeoutMs) ?? DEFAULT_TIMEOUT_MS;
    const now = /* @__PURE__ */ new Date();
    this.state = {
      userId: null,
      factors: [],
      currentLevel: 0,
      sessionId: this.generateSessionId(),
      expiresAt: new Date(now.getTime() + this.timeoutMs),
      lastActivityAt: now
    };
  }
  /** Retorna una copia readonly del estado actual */
  getState() {
    return Object.freeze({ ...this.state, factors: [...this.state.factors] });
  }
  /**
   * Actualiza el timestamp de última actividad y extiende la expiración.
   * Llamar en cada interacción del usuario (click, navegación, API call).
   */
  updateActivity() {
    const now = /* @__PURE__ */ new Date();
    this.state.lastActivityAt = now;
    this.state.expiresAt = new Date(now.getTime() + this.timeoutMs);
  }
  /**
   * Comprueba si la sesión ha expirado por inactividad.
   */
  isExpired() {
    return /* @__PURE__ */ new Date() > this.state.expiresAt;
  }
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
  requireLevel(requirement, registry) {
    if (this.isExpired()) {
      return {
        success: false,
        required: { minLevel: 1, reason: "Sesi\xF3n expirada. Por favor inicia sesi\xF3n nuevamente." },
        currentLevel: 0
      };
    }
    const currentLevel = registry.getHighestLevel();
    this.state.currentLevel = currentLevel;
    if (currentLevel < requirement.minLevel) {
      return {
        success: false,
        required: requirement,
        currentLevel
      };
    }
    if (requirement.allowedFactors && requirement.allowedFactors.length > 0) {
      const hasAllowedFactor = requirement.allowedFactors.some(
        (type) => registry.get(type) !== void 0
      );
      if (!hasAllowedFactor) {
        return {
          success: false,
          required: requirement,
          currentLevel
        };
      }
    }
    this.updateActivity();
    return { success: true, newLevel: currentLevel };
  }
  /**
   * Genera un device fingerprint básico sin PII.
   * Solo para correlacionar sesiones del mismo dispositivo, no para tracking.
   */
  generateDeviceId() {
    if (typeof window === "undefined") return "server";
    const raw = [
      navigator.userAgent,
      screen.width,
      screen.height,
      screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone
    ].join("|");
    let hash = 5381;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) + hash + raw.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  /** Genera un sessionId único */
  generateSessionId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
  /**
   * Persiste el estado en sessionStorage (no localStorage — decisión de seguridad).
   * No persiste datos sensibles como tokens o contraseñas.
   */
  save() {
    if (typeof sessionStorage === "undefined") return;
    try {
      const data = {
        ...this.state,
        expiresAt: this.state.expiresAt.toISOString(),
        lastActivityAt: this.state.lastActivityAt.toISOString(),
        factors: this.state.factors.map((f) => {
          var _a;
          return {
            ...f,
            verifiedAt: (_a = f.verifiedAt) == null ? void 0 : _a.toISOString()
          };
        })
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
    }
  }
  /**
   * Restaura una sesión desde sessionStorage.
   * Retorna null si no hay sesión guardada o está expirada.
   *
   * @example
   * const session = SessionManager.restore() ?? new SessionManager();
   */
  static restore() {
    if (typeof sessionStorage === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      const manager = new _SessionManager();
      manager.state = {
        userId: data["userId"],
        factors: data["factors"].map((f) => ({
          type: f["type"],
          level: f["level"],
          label: f["label"],
          verifiedAt: f["verifiedAt"] ? new Date(f["verifiedAt"]) : void 0,
          deviceId: f["deviceId"]
        })),
        currentLevel: data["currentLevel"],
        sessionId: data["sessionId"],
        expiresAt: new Date(data["expiresAt"]),
        lastActivityAt: new Date(data["lastActivityAt"])
      };
      if (manager.isExpired()) {
        manager.clear();
        return null;
      }
      return manager;
    } catch {
      return null;
    }
  }
  /**
   * Limpia la sesión de sessionStorage y resetea el estado.
   */
  clear() {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    const now = /* @__PURE__ */ new Date();
    this.state = {
      userId: null,
      factors: [],
      currentLevel: 0,
      sessionId: this.generateSessionId(),
      expiresAt: new Date(now.getTime() + this.timeoutMs),
      lastActivityAt: now
    };
  }
};

// src/requireFactor.ts
function requireFactor(level, reason, registry, session) {
  const requirement = { minLevel: level, reason };
  return session.requireLevel(requirement, registry);
}

// src/cspHeaders.ts
function buildCSP(config) {
  const directives = [];
  const add = (key, values) => {
    if (values && values.length > 0) {
      directives.push(`${key} ${values.join(" ")}`);
    }
  };
  add("default-src", config.defaultSrc);
  add("script-src", config.scriptSrc);
  add("style-src", config.styleSrc);
  add("img-src", config.imgSrc);
  add("connect-src", config.connectSrc);
  add("font-src", config.fontSrc);
  add("frame-src", config.frameSrc);
  if (config.reportUri) {
    directives.push(`report-uri ${config.reportUri}`);
  }
  return directives.join("; ");
}
function injectCSPMeta(config) {
  if (typeof document === "undefined") return;
  const existing = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  existing == null ? void 0 : existing.remove();
  const meta = document.createElement("meta");
  meta.setAttribute("http-equiv", "Content-Security-Policy");
  meta.setAttribute("content", buildCSP(config));
  const head = document.head;
  if (head.firstChild) {
    head.insertBefore(meta, head.firstChild);
  } else {
    head.appendChild(meta);
  }
}
var vientonorteCSP = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'"
    // Hashes de scripts inline (preferible a 'unsafe-inline')
    // Agregar hashes específicos en producción
  ],
  styleSrc: [
    "'self'",
    "'unsafe-inline'",
    // Necesario para CSS vars / tokens en runtime
    "https://fonts.googleapis.com"
  ],
  imgSrc: [
    "'self'",
    "data:",
    "https:",
    "blob:"
  ],
  connectSrc: [
    "'self'"
    // Agregar URL de Supabase del proyecto:
    // 'https://tu-proyecto.supabase.co',
  ],
  fontSrc: [
    "'self'",
    "https://fonts.gstatic.com"
  ],
  frameSrc: ["'none'"]
};
export {
  FactorRegistry,
  SessionManager,
  buildCSP,
  injectCSPMeta,
  requireFactor,
  vientonorteCSP
};
