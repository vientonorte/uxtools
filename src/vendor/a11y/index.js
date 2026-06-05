// src/useFocusTrap.ts
import { useEffect } from "react";

// src/focusable.ts
var FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "details > summary",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])'
].join(", ");
function getFocusableElements(container) {
  const candidates = Array.from(
    container.querySelectorAll(FOCUSABLE_SELECTORS)
  );
  return candidates.filter((el) => isFocusable(el));
}
function isFocusable(el) {
  if (!el.offsetParent && el.tagName !== "BODY") {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
  }
  if (el.hasAttribute("hidden")) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (el.hasAttribute("inert") || el.closest("[inert]")) return false;
  const tabindex = el.getAttribute("tabindex");
  if (tabindex === "-1") return false;
  if (el.disabled) return false;
  return true;
}

// src/useFocusTrap.ts
function createFocusTrap(element) {
  let previouslyFocused = null;
  function handleKeyDown(e) {
    if (e.key !== "Tab") return;
    const focusables = getFocusableElements(element);
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !element.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || !element.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  return {
    activate() {
      previouslyFocused = document.activeElement;
      const focusables = getFocusableElements(element);
      if (focusables.length > 0) focusables[0].focus();
      document.addEventListener("keydown", handleKeyDown);
    },
    deactivate() {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
      previouslyFocused = null;
    }
  };
}
function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const trap = createFocusTrap(ref.current);
    trap.activate();
    return () => {
      trap.deactivate();
    };
  }, [active, ref]);
}

// src/useLiveRegion.ts
import { useEffect as useEffect2, useRef, useCallback } from "react";
var SR_ONLY_STYLES = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  borderWidth: "0"
};
function useLiveRegion(politeness = "polite") {
  const regionRef = useRef(null);
  const timeoutRef = useRef(null);
  useEffect2(() => {
    const div = document.createElement("div");
    div.setAttribute("role", "status");
    div.setAttribute("aria-live", politeness);
    div.setAttribute("aria-atomic", "true");
    div.setAttribute("aria-relevant", "additions text");
    Object.assign(div.style, SR_ONLY_STYLES);
    document.body.appendChild(div);
    regionRef.current = div;
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      div.remove();
      regionRef.current = null;
    };
  }, [politeness]);
  const announce = useCallback((message) => {
    const region = regionRef.current;
    if (!region) return;
    region.textContent = "";
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (regionRef.current) {
        regionRef.current.textContent = message;
      }
    }, 100);
  }, []);
  return announce;
}

// src/useAnnouncer.ts
import { useCallback as useCallback2 } from "react";
function useAnnouncer() {
  const announce = useLiveRegion("polite");
  const clear = useCallback2(() => {
    announce("");
  }, [announce]);
  return { announce, clear };
}

// src/SkipLink.tsx
import { jsx } from "react/jsx-runtime";
function SkipLink({
  href = "#main",
  label = "Saltar al contenido principal"
}) {
  return /* @__PURE__ */ jsx(
    "a",
    {
      href,
      className: "vn-skip-link",
      children: label
    }
  );
}
export {
  SkipLink,
  createFocusTrap,
  getFocusableElements,
  isFocusable,
  useAnnouncer,
  useFocusTrap,
  useLiveRegion
};
