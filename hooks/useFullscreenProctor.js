                    import { useEffect, useCallback, useState, useRef } from "react";

export const useFullscreenProctor = ({
  onFullscreenViolation,
  enableWarnings = true,
  maxViolations = 3,
  enabled = true,
} = {}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violations, setViolations] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [warningMessage, setWarningMessage] = useState(null);
  const violationLogsRef = useRef([]);

  // Check if currently in fullscreen
  const checkFullscreen = useCallback(() => {
    if (typeof document === "undefined") return false;
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement
    );
  }, []);

  // Enter fullscreen helper
  const enterFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return;
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (error) {
      console.warn("Fullscreen request requires user gesture or permission:", error);
    }
  }, []);

  const recordViolation = useCallback(
    (type, details = "") => {
      if (isBlocked) return;

      setViolations((prev) => {
        const next = prev + 1;
        const entry = {
          type,
          details,
          violationNumber: next,
          timestamp: new Date().toISOString(),
        };
        violationLogsRef.current.push(entry);

        if (enableWarnings) {
          if (next >= maxViolations) {
            setWarningMessage(
              `Maximum violation limit reached (${next}/${maxViolations})! Your exam is being automatically submitted for review.`
            );
          } else {
            setWarningMessage(
              `Security Warning: ${type.replace(/_/g, " ")}. Please stay in fullscreen and do not switch windows. Violation ${next} of ${maxViolations}.`
            );
          }
        }

        if (next >= maxViolations) {
          setIsBlocked(true);
          onFullscreenViolation?.("max_violations_reached", next, violationLogsRef.current);
        } else {
          onFullscreenViolation?.(type, next, violationLogsRef.current);
        }

        return next;
      });
    },
    [isBlocked, enableWarnings, maxViolations, onFullscreenViolation]
  );

  // Handle fullscreen change
  const handleFullscreenChange = useCallback(() => {
    const isNowFullscreen = checkFullscreen();
    setIsFullscreen(isNowFullscreen);

    if (!isNowFullscreen && !isBlocked) {
      recordViolation("exited_fullscreen", "User exited fullscreen view");
    }
  }, [checkFullscreen, isBlocked, recordViolation]);

  // Handle visibility change (tab switching, minimizing browser)
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && !isBlocked) {
      recordViolation("tab_switch", "User navigated away or switched browser tab");
    }
  }, [isBlocked, recordViolation]);

  // Handle window blur (user clicked outside browser, opened split screen)
  const handleWindowBlur = useCallback(() => {
    if (!isBlocked && checkFullscreen()) {
      recordViolation("window_blur", "Browser window lost focus");
    }
  }, [isBlocked, checkFullscreen, recordViolation]);

  // Prevent common escape shortcuts
  const preventExit = useCallback((e) => {
    if (e.key === "Escape" || e.key === "F11" || (e.altKey && e.key === "Tab") || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, []);

  // Prevent right-click context menu & copy/paste
  const preventContextMenu = useCallback((e) => {
    e.preventDefault();
    return false;
  }, []);

  const clearWarning = useCallback(() => {
    setWarningMessage(null);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("msfullscreenchange", handleFullscreenChange);

    document.addEventListener("keydown", preventExit, true);
    document.addEventListener("keyup", preventExit, true);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    document.addEventListener("contextmenu", preventContextMenu);

    const preventNavigation = (e) => {
      e.preventDefault();
      return "";
    };
    window.addEventListener("beforeunload", preventNavigation);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("msfullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", preventExit, true);
      document.removeEventListener("keyup", preventExit, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("contextmenu", preventContextMenu);
      window.removeEventListener("beforeunload", preventNavigation);
    };
  }, [
    handleFullscreenChange,
    handleVisibilityChange,
    handleWindowBlur,
    preventExit,
    preventContextMenu,
    enabled,
  ]);

  return {
    isFullscreen,
    violations,
    isBlocked,
    warningMessage,
    clearWarning,
    enterFullscreen,
    checkFullscreen,
    violationLogs: violationLogsRef.current,
  };
};
