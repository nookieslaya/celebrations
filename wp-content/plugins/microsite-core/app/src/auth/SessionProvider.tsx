import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createApiClient, type ApiClient, type Session } from "../api/client";
import { clearRememberedSteps } from "../editors/navigation";
import { config } from "../config";
import { copy } from "../copy";

interface SessionContextValue {
  session: Session;
  api: ApiClient;
  ready: boolean;
  message: string;
  applySession: (session: Session, announce?: boolean) => void;
  retryBootstrap: () => void;
  bootstrapError: string;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const initiallyAuthenticated = useRef(Boolean(config.session.user));
  const [session, setSession] = useState(config.session);
  const [ready, setReady] = useState(!config.session.user);
  const [message, setMessage] = useState("");
  const [bootstrapError, setBootstrapError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const nonce = useRef(config.session.nonce);
  const channel = useRef<BroadcastChannel | null>(null);

  const clearSession = useCallback((reason: string) => {
    clearRememberedSteps();
    nonce.current = null;
    setSession((current) => ({ ...current, user: null, nonce: null }));
    setMessage(reason);
    setReady(true);
    setBootstrapError("");
  }, []);

  const applySession = useCallback((next: Session, announce = false) => {
    if (!next.user) {
      clearRememberedSteps();
    }
    nonce.current = next.nonce;
    setSession(next);
    setMessage("");
    setBootstrapError("");
    setReady(true);
    if (announce) {
      channel.current?.postMessage("identity-changed");
    }
  }, []);

  const api = useMemo(
    () =>
      createApiClient({
        restUrl: config.restUrl,
        getNonce: () => nonce.current,
        getAuthCsrfToken: () => config.authCsrfToken,
        onNonce: (value) => {
          nonce.current = value;
        },
        onSessionExpired: () => clearSession(copy.sessionExpired),
      }),
    [clearSession],
  );

  useEffect(() => {
    // The HTML bootstrap is one-use input, not a second private session store.
    config.session = { ...config.session, user: null, nonce: null };
    const element = document.getElementById("microsite-config");
    if (element) {
      element.textContent = JSON.stringify(config);
    }
  }, []);

  useEffect(() => {
    if (!initiallyAuthenticated.current) {
      return;
    }
    const controller = new AbortController();
    let active = true;
    setReady(false);
    setBootstrapError("");
    api
      .session(controller.signal)
      .then((next) => {
        if (active) {
          applySession(next);
        }
      })
      .catch((error: Error) => {
        if (active && error.name !== "AbortError" && nonce.current) {
          setBootstrapError(error.message);
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, applySession, attempt]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }
    const connection = new BroadcastChannel(
      `microsite-session:${config.appUrl}`,
    );
    channel.current = connection;
    connection.onmessage = () => clearSession(copy.sessionChanged);
    return () => {
      channel.current = null;
      connection.close();
    };
  }, [clearSession]);

  useEffect(() => {
    const controller = new AbortController();
    const verify = () => {
      if (!nonce.current) {
        return;
      }
      // Also detects native WP logout/account changes outside this panel.
      void api.session(controller.signal).catch(() => undefined);
    };
    window.addEventListener("focus", verify);
    return () => {
      window.removeEventListener("focus", verify);
      controller.abort();
    };
  }, [api]);

  return (
    <SessionContext.Provider
      value={{
        session,
        api,
        ready,
        message,
        applySession,
        bootstrapError,
        retryBootstrap: () => setAttempt((value) => value + 1),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("SessionProvider is required.");
  }
  return context;
}
