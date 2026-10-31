import { useState } from "react";
import { AuthField, Button, Icon, Logo, photos, type AuthView } from "../components/shared";

export function AuthPage({ onLogin, onRegister }: { onLogin: (email: string, password: string) => Promise<void>; onRegister: (fullName: string, email: string, password: string, extra: { phone: string; location: string }) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<AuthView>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [legalView, setLegalView] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      setBusy(true);
      if (view === "register") {
        if (form.get("password") !== form.get("confirmPassword")) { setError("Passwords do not match."); return; }
        await onRegister(String(form.get("fullName")), String(form.get("email")), String(form.get("password")), { phone: String(form.get("phone") ?? ""), location: String(form.get("location") ?? "") });
      } else if (view === "login") {
        await onLogin(String(form.get("email")), String(form.get("password")));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-story">
        <Logo inverse />
        <div className="auth-story-copy"><span className="eyebrow light">TOGETHER, CHANGE IS POSSIBLE</span><h1>Give your time.<br />Grow your community.</h1><p>Discover meaningful opportunities, meet people who care, and see the difference you make.</p>
          <div className="auth-impact"><div><strong>2,400+</strong><span>active volunteers</span></div><div><strong>18,500</strong><span>hours contributed</span></div></div>
        </div>
        <div className="auth-photo"><img src={photos.community} alt="Hope Foundation volunteers building community" /><span>Photo by Frederick Shaw on Unsplash</span></div>
      </section>
      <main className="auth-main">
        <div className="auth-mobile-logo"><Logo /></div>
        <form className="auth-card" onSubmit={submit}>
          {error && <p role="alert" className="form-error">{error}</p>}
          {message && <p role="status" className="form-notice">{message}</p>}
          {view === "login" && <><span className="auth-kicker">VOLUNTEER PORTAL</span><h2>Welcome back</h2><p>Sign in with your Hope Foundation account.</p>
            <AuthField label="Email address" name="email" placeholder="you@example.com" type="email" />
            <AuthField label="Password" name="password" placeholder="Enter your password" type={showPassword ? "text" : "password"} action={<button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>} />
            <div className="auth-options"><label><input name="remember" type="checkbox" />Remember me</label><button type="button" onClick={() => setView("forgot")}>Forgot password?</button></div>
            <Button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button><div className="auth-switch">New to Hope Foundation? <button type="button" onClick={() => setView("register")}>Create an account</button></div>
          </>}
          {view === "register" && <><span className="auth-kicker">JOIN OUR COMMUNITY</span><h2>Create your account</h2><p>Start your volunteering journey in just a few steps.</p>
            <div className="auth-two"><AuthField label="Full name" name="fullName" placeholder="Your full name" /><AuthField label="Phone number" name="phone" placeholder="+91 00000 00000" /></div>
            <AuthField label="Email address" name="email" placeholder="you@example.com" type="email" /><AuthField label="Location" name="location" placeholder="City, State" />
            <div className="auth-two"><AuthField label="Password" name="password" minLength={12} placeholder="12+ characters" type="password" /><AuthField label="Confirm password" name="confirmPassword" minLength={8} placeholder="Repeat password" type="password" /></div>
            <label className="terms"><input required type="checkbox" />I agree to the <button type="button" onClick={() => setLegalView(legalView === "terms" ? "" : "terms")}>Terms</button> and <button type="button" onClick={() => setLegalView(legalView === "privacy" ? "" : "privacy")}>Privacy Policy</button>.</label>
            {legalView && <p className="form-notice">{legalView === "terms" ? "Volunteer respectfully, follow organiser guidance, and attend only the activities you have accepted." : "Your profile and activity are stored securely in the Hope Foundation system so staff can coordinate your volunteering."}</p>}
            <Button type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</Button><div className="auth-switch">Already have an account? <button type="button" onClick={() => setView("login")}>Sign in</button></div>
          </>}
          {view === "forgot" && <><button className="auth-back" type="button" onClick={() => { setView("login"); }}><Icon name="arrow" size={16} />Back to sign in</button>
            <div className="auth-success"><span><Icon name="check" /></span><h2>Need a new password?</h2><p>Password resets are handled by the Hope Foundation team. Please contact your volunteer coordinator or an administrator and they will reset it for you.</p><Button variant="secondary" onClick={() => setView("login")}>Back to sign in</Button></div>
          </>}
        </form>
        <small className="auth-footer">© 2026 Hope Foundation · Volunteer support · Accessibility</small>
      </main>
    </div>
  );
}
