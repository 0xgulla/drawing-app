import { useEffect, useState } from "react";
import App from "./App";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import PageTransitionLoader from "./components/PageTransitionLoader";
import UserGuidePage from "./components/UserGuidePage";

type View = "landing" | "login" | "app" | "guide";

function pathnameToView(pathname: string): View {
  if (pathname === "/draw" || pathname.startsWith("/draw/")) return "app";
  if (pathname === "/guide" || pathname.startsWith("/guide/")) return "guide";
  if (pathname === "/login" || pathname.startsWith("/login/")) return "login";
  // "/" and anything else → redirect to /draw
  return "app";
}

export default function Root() {
  const [view, setView] = useState<View>(() =>
    pathnameToView(window.location.pathname),
  );
  const [isLoading, setIsLoading] = useState(false);

  // Sync URL → view when user uses browser back/forward
  useEffect(() => {
    const onPop = () => setView(pathnameToView(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // On first load, if path is "/" redirect to /draw
  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState(null, "", "/draw");
    }
  }, []);

  const navigate = (next: View) => {
    setIsLoading(true);
    const pathMap: Record<View, string> = {
      app: "/draw",
      guide: "/guide",
      login: "/login",
      landing: "/",
    };
    setTimeout(() => {
      window.history.pushState(null, "", pathMap[next]);
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
