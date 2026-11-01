import { useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";
import { copy } from "../copy";

export function ErrorNotice({ error }: { error: unknown }) {
  let message = error instanceof Error ? error.message : copy.networkError;
  if (error instanceof ApiError && error.status === 404) {
    message = copy.notFoundDescription;
  } else if (
    error instanceof ApiError &&
    error.status === 403 &&
    error.code !== "rest_cookie_invalid_nonce"
  ) {
    message =
      error.code === "microsite_forbidden" ? copy.forbidden : error.message;
  }
  return (
    <p className="notice error" role="alert">
      {message}
    </p>
  );
}

export function Loading({ message = copy.loading }: { message?: string }) {
  return (
    <p className="loading" role="status">
      {message}
    </p>
  );
}

export function useMounted() {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}

export function useResource<Data>(
  load: (signal: AbortSignal) => Promise<Data>,
) {
  const [state, setState] = useState<{
    data: Data | null;
    error: unknown;
    loading: boolean;
  }>({ data: null, error: null, loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ data: null, error: null, loading: true });
    load(controller.signal)
      .then((data) => {
        if (active) {
          setState({ data, error: null, loading: false });
        }
      })
      .catch((error: Error) => {
        if (active && error.name !== "AbortError") {
          setState({ data: null, error, loading: false });
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [load, attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
