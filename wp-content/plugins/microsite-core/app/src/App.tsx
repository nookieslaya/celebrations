import { useEffect, useState } from "react";

type Config = { appUrl: string; restUrl: string; mode: string };
const config: Config = JSON.parse(
  document.getElementById("microsite-config")!.textContent!,
);
const base = new URL(config.appUrl).pathname.replace(/\/$/, "");
// English copy is centralized to allow introducing translations in the next stage.

export default function App() {
  const copy = {
    brand: "microsites",
    overview: "Overview",
    sites: "My sites",
    eyebrow: "YOUR CREATIVE WORKSPACE",
    title: "Small pages. Big moments.",
    intro:
      "A home for the things worth celebrating. Your workspace is taking shape.",
    empty: "Your next idea starts here",
    emptyDescription:
      "Projects will appear here once project creation is available.",
    stage: "Foundation preview",
    stageDescription:
      "The workspace is ready. Accounts, projects and publishing are coming in the next stages.",
  };
  const [path, setPath] = useState(window.location.pathname.replace(/\/$/, ""));
  const [note, setNote] = useState("");
  useEffect(() => {
    const update = () => setPath(window.location.pathname.replace(/\/$/, ""));
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const isSites = path === `${base}/sites`;
  const known = path === base || isSites;
  function navigate(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      event.button ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    history.pushState(null, "", event.currentTarget.href);
    setPath(window.location.pathname.replace(/\/$/, ""));
  }
  return (
    <div className="layout">
      <aside>
        <a className="brand" href={config.appUrl} onClick={navigate}>
          <span className="brand-icon">✳</span>
          {copy.brand}
          <span className="dot">.</span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Workspace">
          <a
            aria-current={path === base ? "page" : undefined}
            href={config.appUrl}
            onClick={navigate}
          >
            ◫ <span>{copy.overview}</span>
          </a>
          <a
            aria-current={isSites ? "page" : undefined}
            href={`${config.appUrl}sites`}
            onClick={navigate}
          >
            ▤ <span>{copy.sites}</span>
          </a>
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" /> A little room for big ideas
          <br />
          <small>Workspace · v0.1</small>
        </div>
      </aside>
      <div className="content">
        <header>
          <span>
            Workspace <span className="slash">/</span>{" "}
            {isSites ? copy.sites : "Overview"}
          </span>
          <span className="badge">{copy.stage}</span>
        </header>
        <main>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>
            {known ? (isSites ? "Your sites" : copy.title) : "Page not found"}
          </h1>
          <p className="intro">
            {known
              ? isSites
                ? "A place for every celebration, story and new beginning."
                : copy.intro
              : "Choose a page from the workspace navigation."}
          </p>
          {known && (
            <>
              <section className="empty">
                <div className="paper" aria-hidden="true">
                  <span>✳</span>
                  <i />
                  <i />
                  <b />
                </div>
                <span className="mini-label">
                  A BLANK CANVAS, ENDLESS POSSIBILITIES
                </span>
                <h2>{copy.empty}</h2>
                <p>{copy.emptyDescription}</p>
                <span className="coming">Project creation · coming soon</span>
              </section>
              <section className="foundation">
                <span className="spark">✧</span>
                <div>
                  <h2>{copy.stage}</h2>
                  <p>{copy.stageDescription}</p>
                </div>
                <span className="mode">{config.mode}</span>
              </section>
              <details>
                <summary>Try the workspace</summary>
                <label htmlFor="scratch">A temporary note (not saved)</label>
                <input
                  id="scratch"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="An idea worth celebrating…"
                />
              </details>
            </>
          )}
        </main>
        <footer>
          Made for moments that matter.<span>MICROSITES / EARLY PREVIEW</span>
        </footer>
      </div>
    </div>
  );
}
