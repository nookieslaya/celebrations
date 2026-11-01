import { useRef, useState, type FormEvent } from "react";
import { useSession } from "../auth/SessionProvider";
import { appBase } from "../config";
import { copy } from "../copy";
import { ErrorNotice, useMounted } from "../components/Async";
import { Link, safeReturn, useRouter } from "../routing/Router";

export function AuthView({ registering }: { registering: boolean }) {
  const { api, session, applySession, message } = useSession();
  const { location, navigate } = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const submitting = useRef(false);
  const mounted = useMounted();
  const next = safeReturn(
    new URL(location, window.location.origin).searchParams.get("next"),
  );
  const closed = registering && !session.registrationEnabled;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) {
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const authenticated = registering
        ? await api.register({
            email,
            password,
            passwordConfirmation: confirmation,
          })
        : await api.login({ email, password });
      if (mounted.current) {
        setPassword("");
        setConfirmation("");
        applySession(authenticated, true);
        navigate(next, true, true);
      }
    } catch (failure) {
      if (mounted.current) {
        setError(failure);
      }
    } finally {
      submitting.current = false;
      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">{copy.workspace}</p>
      <h1>{registering ? copy.register : copy.login}</h1>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {closed ? (
        <p className="notice" role="status">
          {copy.registrationClosed}
        </p>
      ) : (
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <label htmlFor="email">{copy.email}</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label htmlFor="password">{copy.password}</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={registering ? "new-password" : "current-password"}
              required
              minLength={registering ? 12 : 1}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {registering && (
              <>
                <p className="field-help">{copy.passwordHelp}</p>
                <label htmlFor="confirmation">{copy.confirmation}</label>
                <input
                  id="confirmation"
                  name="passwordConfirmation"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </>
            )}
            {error !== null && <ErrorNotice error={error} />}
            <button className="button primary" type="submit">
              {busy
                ? copy.checkingSession
                : registering
                  ? copy.registerAction
                  : copy.loginAction}
            </button>
          </fieldset>
        </form>
      )}
      <Link
        className="text-link"
        href={`${appBase}/${registering ? "login" : "register"}?next=${encodeURIComponent(next)}`}
      >
        {registering ? copy.authSwitchLogin : copy.authSwitchRegister}
      </Link>
    </section>
  );
}
