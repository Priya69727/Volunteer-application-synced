import { useCallback, useEffect, useState } from "react";
import { AppShell } from "./components/layout";
import { DemoStoreProvider } from "./components/demoStore";
import { PortalProvider } from "./components/portal";
import { clearNavigationState } from "./components/navigationState";
import { AuthPage } from "./pages/AuthPage";
import { ApiError, api, type AuthUser } from "./api";

const PORTAL_ROLES = ["Member", "Volunteer", "Admin", "Project Manager", "Staff"];

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState("");

  const restoreSession = useCallback(async () => {
    setChecking(true);
    setSessionError("");
    try {
      const response = await api.me();
      setUser(response.user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
      } else {
        setSessionError(error instanceof Error ? error.message : "Could not check your saved session.");
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { void restoreSession(); }, [restoreSession]);

  const login = async (email: string, password: string) => {
    const r = await api.login(email, password);
    if (!PORTAL_ROLES.includes(r.user.role)) { await api.logout().catch(() => undefined); throw new Error("This portal is for volunteers. Please use the main Hope Foundation system."); }
    setSessionError("");
    setUser(r.user);
  };
  const register = async (fullName: string, email: string, password: string, extra: { phone: string; location: string }) => {
    const r = await api.register(fullName, email, password);
    await api.updateProfile({ phone: extra.phone, location: extra.location }).catch(() => undefined);
    setSessionError("");
    setUser(r.user);
  };
  const logout = useCallback(() => {
    void api.logout().catch(() => undefined);
    ["volunteer-portal-demo-v1", "volunteer-portal-read-notifications"].forEach((k) => window.localStorage.removeItem(k));
    clearNavigationState();
    setUser(null);
  }, []);

  if (checking) return <div className="page"><p role="status">Loading…</p></div>;
  if (sessionError) return (
    <div className="page">
      <h1>We couldn’t restore your session</h1>
      <p role="alert" className="form-error">{sessionError}</p>
      <button className="btn btn-primary" onClick={() => void restoreSession()}>Try again</button>
    </div>
  );
  return (
    <DemoStoreProvider>
      {user ? <PortalProvider logout={logout}><AppShell logout={logout} /></PortalProvider> : <AuthPage onLogin={login} onRegister={register} />}
    </DemoStoreProvider>
  );
}
