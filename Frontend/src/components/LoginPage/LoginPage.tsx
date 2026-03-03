import AuraRingAnimation from "./AuraRingAnimation";
import "./LoginPage.css";

export type LoginStatus = "loading" | "logged-in" | "logged-out";

type LoginPageProps = {
  status: LoginStatus;
  onLogin: () => void;
};

function LoginPage({ status, onLogin }: LoginPageProps) {
  return (
    <div className="loginPage relative overflow-hidden">
      <section className="loginPanel">
        <h1 className="loginTitle">AUDIO AURA</h1>
        <p className="tagline">Uncover the energy behind your music</p>
        {status === "loading" ? (
          <p className="statusText">Checking login...</p>
        ) : (
          <button className="loginButton" onClick={onLogin}>
            LOG IN
          </button>
        )}
      </section>
      
      <AuraRingAnimation className="loginAuraWrap" />

    </div>
  );
}

export default LoginPage;
