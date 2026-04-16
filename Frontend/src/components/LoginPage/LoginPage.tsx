import AuraRingAnimation from "./AuraRingAnimation";
import "./LoginPage.css";

export type LoginStatus = "loading" | "logged-in" | "logged-out";

type LoginPageProps = {
  status: LoginStatus;
  onLogin: () => void;
  loginUrl: string;
};

function LoginPage({ status, onLogin, loginUrl }: LoginPageProps) {
  return (
    <div className="loginPage relative overflow-hidden">
      <section className="loginPanel">
        <h1 className="loginTitle">AUDIO AURA</h1>
        <p className="tagline">Uncover the energy behind your music</p>
        {status === "loading" ? (
          <p className="statusText">Checking login...</p>
        ) : (
          <>
            <a
              className="loginButton"
              href={loginUrl}
              onClick={(event) => {
                event.preventDefault();
                onLogin();
              }}
            >
              LOG IN
            </a>
          </>
        )}
      </section>
      
      <AuraRingAnimation className="loginAuraWrap" />

    </div>
  );
}

export default LoginPage;
