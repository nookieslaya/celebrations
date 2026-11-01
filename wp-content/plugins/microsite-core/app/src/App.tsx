import { useEffect, useRef, useState } from "react";
import { SessionProvider, useSession } from "./auth/SessionProvider";
import { Router, Link, safeReturn, useRouter } from "./routing/Router";
import { appBase, config } from "./config";
import { copy } from "./copy";
import { ErrorNotice, Loading, useMounted } from "./components/Async";
import { AuthView } from "./views/AuthView";
import { SitesView } from "./views/SitesView";
import { NewSiteView } from "./views/NewSiteView";
import { EditorView } from "./views/EditorView";

export default function App() {
  return (
    <SessionProvider>
      <Router>
        <Workspace />
      </Router>
    </SessionProvider>
  );
}

function Workspace() {
  const { session, api, ready, applySession, bootstrapError, retryBootstrap } =
    useSession();
  const { location, navigate, confirmLeave } = useRouter();
  const [logoutError, setLogoutError] = useState<unknown>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutPending = useRef(false);
  const mounted = useMounted();
  const url = new URL(location, window.location.origin);
  const path = url.pathname.replace(/\/$/, "");
  const suffix = path.slice(appBase.length);
  const authPage = suffix === "/login" || suffix === "/register";
  const protectedPage = suffix === "/sites" || suffix.startsWith("/sites/");
  const editorMatch = /^\/sites\/([1-9][0-9]*)$/.exec(suffix);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!suffix) {
      navigate(`${appBase}/${session.user ? "sites" : "login"}`, true, true);
    } else if (!session.user && protectedPage) {
      const next = safeReturn(location);
      navigate(`${appBase}/login?next=${encodeURIComponent(next)}`, true, true);
    } else if (session.user && authPage) {
      navigate(safeReturn(url.searchParams.get("next")), true, true);
    }
  }, [
    ready,
    session.user,
    suffix,
    protectedPage,
    authPage,
    location,
    navigate,
    url.search,
  ]);

  async function logout() {
    if (logoutPending.current || !confirmLeave()) {
      return;
    }
    logoutPending.current = true;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      const anonymous = await api.logout();
      if (mounted.current) {
        applySession(anonymous, true);
        navigate(`${appBase}/login`, true, true);
      }
    } catch (error) {
      if (mounted.current) {
        setLogoutError(error);
      }
    } finally {
      logoutPending.current = false;
      if (mounted.current) {
        setLoggingOut(false);
      }
    }
  }

  let view;
  if (!ready) {
    view = bootstrapError ? (
      <>
        <ErrorNotice error={new Error(bootstrapError)} />
        <button className="button" onClick={retryBootstrap}>
          {copy.retry}
        </button>
      </>
    ) : (
      <Loading />
    );
  } else if (
    (!session.user && protectedPage) ||
    (session.user && authPage) ||
    !suffix
  ) {
    view = <Loading />;
  } else if (authPage) {
    view = <AuthView key={suffix} registering={suffix === "/register"} />;
  } else if (session.user && suffix === "/sites") {
    view = <SitesView key={`${session.user.id}:${url.search}`} />;
  } else if (session.user && suffix === "/sites/new") {
    view = <NewSiteView key={session.user.id} />;
  } else if (session.user && editorMatch) {
    view = (
      <EditorView
        key={`${session.user.id}:${editorMatch[1]}`}
        id={Number(editorMatch[1])}
      />
    );
  } else {
    view = (
      <>
        <h1>{copy.unknownPage}</h1>
        <Link className="text-link" href={`${appBase}/sites`}>
          {copy.back}
        </Link>
      </>
    );
  }

  return (
    <div className="layout">
      <aside>
        <Link className="brand" href={`${appBase}/sites`}>
          <span className="brand-icon">✳</span>
          {copy.brand}
          <span className="dot">.</span>
        </Link>
        <div className="workspace-label">{copy.workspace.toUpperCase()}</div>
        <nav aria-label="Workspace">
          {session.user && ready ? (
            <Link
              aria-current={protectedPage ? "page" : undefined}
              href={`${appBase}/sites`}
            >
              <span aria-hidden="true">▤</span>
              <span>{copy.sites}</span>
            </Link>
          ) : (
            <Link href={`${appBase}/login`}>{copy.loginAction}</Link>
          )}
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" /> {copy.early}
          <br />
          <small>Workspace · v0.3</small>
        </div>
      </aside>
      <div className="content">
        <header>
          <span>{copy.workspace}</span>
          <div className="account-menu">
            {session.user && ready && (
              <>
                <span className="account-email">{session.user.email}</span>
                <button
                  className="button"
                  disabled={loggingOut}
                  onClick={logout}
                >
                  {copy.logout}
                </button>
              </>
            )}
          </div>
        </header>
        <main>
          {logoutError !== null && session.user && (
            <ErrorNotice error={logoutError} />
          )}
          {view}
        </main>
        <footer>
          {copy.early}
          <span>{config.mode}</span>
        </footer>
      </div>
    </div>
  );
}
