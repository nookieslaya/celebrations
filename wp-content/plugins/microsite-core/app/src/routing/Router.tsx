import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { appBase } from "../config";
import { copy } from "../copy";

interface RouterValue {
  location: string;
  navigate: (path: string, replace?: boolean, force?: boolean) => void;
  setDirty: (dirty: boolean) => void;
  confirmLeave: () => boolean;
}
const RouterContext = createContext<RouterValue | null>(null);

export function safeReturn(value: string | null): string {
  const fallback = `${appBase}/sites`;
  if (!value) {
    return fallback;
  }
  try {
    const url = new URL(value, window.location.origin);
    const suffix = url.pathname.slice(appBase.length);
    if (
      url.origin === window.location.origin &&
      url.pathname.startsWith(`${appBase}/`) &&
      /^\/sites(?:\/(?:new|[1-9][0-9]*))?\/?$/.test(suffix)
    ) {
      return url.pathname + url.search;
    }
  } catch {
    // Untrusted return addresses always fall back to the project list.
  }
  return fallback;
}

export function Router({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(
    window.location.pathname + window.location.search,
  );
  const current = useRef(location);
  const dirty = useRef(false);
  const position = useRef(Number(history.state?.micrositeIndex ?? 0));
  const restoring = useRef(false);
  const confirmLeave = useCallback(
    () => !dirty.current || window.confirm(copy.unsavedConfirm),
    [],
  );
  const setDirty = useCallback((value: boolean) => {
    dirty.current = value;
  }, []);

  const navigate = useCallback(
    (path: string, replace = false, force = false) => {
      const target = new URL(path, window.location.origin);
      if (
        target.origin !== window.location.origin ||
        !target.pathname.startsWith(`${appBase}/`)
      ) {
        return;
      }
      if (!force && !confirmLeave()) {
        return;
      }
      if (force) {
        dirty.current = false;
      }
      position.current += replace ? 0 : 1;
      const state = { ...history.state, micrositeIndex: position.current };
      if (replace) {
        history.replaceState(state, "", target);
      } else {
        history.pushState(state, "", target);
      }
      current.current = target.pathname + target.search;
      setLocation(current.current);
      window.scrollTo(0, 0);
    },
    [confirmLeave],
  );

  useEffect(() => {
    history.replaceState(
      { ...history.state, micrositeIndex: position.current },
      "",
    );
    const onPopState = (event: PopStateEvent) => {
      if (restoring.current) {
        restoring.current = false;
        return;
      }
      const nextPosition = Number(
        event.state?.micrositeIndex ?? position.current,
      );
      if (!confirmLeave()) {
        const difference = position.current - nextPosition;
        if (difference) {
          restoring.current = true;
          history.go(difference);
        } else {
          history.replaceState(history.state, "", current.current);
        }
        return;
      }
      position.current = nextPosition;
      current.current = window.location.pathname + window.location.search;
      setLocation(current.current);
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [confirmLeave]);

  return (
    <RouterContext.Provider
      value={{ location, navigate, setDirty, confirmLeave }}
    >
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterValue {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("Router is required.");
  }
  return context;
}

export function Link({
  href,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const { navigate } = useRouter();
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        if (
          event.button ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}
