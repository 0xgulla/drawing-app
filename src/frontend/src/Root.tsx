import { useEffect, useState } from "react";
import App from "./App";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import PageTransitionLoader from "./components/PageTransitionLoader";
import UserGuidePage from "./components/UserGuidePage";

type View = "landing" | "login" | "app" | "guide";

export default function Root() {
  const [view, setView] = useState<View>("landing");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = (next: View) => {
    setIsLoading(true);
    setTimeout(() => {
      setView(next);
      setIsLoading(false);
    }, 600);
  };

  const handleLaunchApp = () => navigate("app");

  return (
    <>
      <PageTransitionLoader isLoading={isLoading} />
      {view === "app" && <App onGoHome={() => navigate("landing")} />}
      {view === "login" && (
        <LoginPage
          onLaunchApp={handleLaunchApp}
          onBack={() => navigate("landing")}
        />
      )}
      {view === "guide" && (
        <UserGuidePage onGoHome={() => navigate("landing")} />
      )}
      {view === "landing" && (
        <LandingPage
          onLaunchApp={handleLaunchApp}
          onShowLogin={() => navigate("login")}
          onShowGuide={() => navigate("guide")}
        />
      )}
    </>
  );
}
