import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const telegramId = params.get("user");
    const gameChoice = params.get("game");

    if (telegramId) localStorage.setItem("telegramId", telegramId);
    if (gameChoice) localStorage.setItem("gameChoice", gameChoice);
  }, [location.search]);

  return (
    <>
      <Outlet />
      <Nav />
    </>
  );
}
