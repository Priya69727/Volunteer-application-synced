import { useCallback, useEffect, useState } from "react";
import { AppShell } from "./components/layout";
import { DemoStoreProvider } from "./components/demoStore";
import { PortalProvider } from "./components/portal";
import { clearNavigationState } from "./components/navigationState";
import { AuthPage } from "./pages/AuthPage";
import { AdminModerationPage } from "./pages/AdminModerationPage";
import { ApiError, api, type AuthUser } from "./api";

const PORTAL_ROLES = ["Member", "Volunteer"];
const MODERATION_ROLE = "Admin";

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [accessNotice, setAccessNotice] = useState("");

  const logout = useCallback(() => {
    void api.logout().catch(() => undefined);
    ["volunteer-portal-demo-v1", "volunteer-portal-read-notifications"].forEach((k) => window.localStorage.removeItem(k));
    clearNavigationState();
    setUser(null);
  }, []);

  const restoreSession = useCallback(async () => {
    setChecking(true);
    setSessionError("");
    try {
      const response = await api.me();
      if (!PORTAL_ROLES.includes(response.user.role) && response.user.role !== MODERATION_ROLE) {
        logout();
        setAccessNotice("This portal is for volunteers. Please use the main Hope Foundation system.");
        return;
      }
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
  }, [logout]);

  useEffect(() => { void restoreSession(); }, [restoreSession]);

  const login = async (email: string, password: string) => {
    const r = await api.login(email, password);
    if (!PORTAL_ROLES.includes(r.user.role) && r.user.role !== MODERATION_ROLE) { await api.logout().catch(() => undefined); throw new Error("This portal is for volunteers. Please use the main Hope Foundation system."); }
    setSessionError("");
    setAccessNotice("");
    setUser(r.user);
  };
  const register = async (fullName: string, email: string, password: string, extra: { phone: string; location: string }) => {
    const r = await api.register(fullName, email, password);
    await api.updateProfile({ phone: extra.phone, location: extra.location }).catch(() => undefined);
    setSessionError("");
    setAccessNotice("");
    setUser(r.user);
  };

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
      {user?.role === MODERATION_ROLE
        ? <AdminModerationPage logout={logout} />
        : user ? <PortalProvider logout={logout}><AppShell logout={logout} /></PortalProvider> : <AuthPage onLogin={login} onRegister={register} notice={accessNotice} />}
    </DemoStoreProvider>
  );
}
