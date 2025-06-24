import { Link, useLocation } from "react-router-dom";

export default function Nav() {
  const location = useLocation();
    const [searchParams] = useSearchParams();
    const telegramId = searchParams.get("user"); // Get telegramId from URL query parameters
    const gameId = searchParams.get("game"); // Get gameId from URL query parameters

  // Helper to apply active styles if the route matches current location
  const getLinkClass = (path) =>
    location.pathname === path
      ? "flex flex-col items-center text-purple-500 text-xs font-semibold"
      : "flex flex-col items-center text-gray-700 text-xs";

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center py-2">
<Link to={`/?user=${telegramId}&game=${gameId}`} className={getLinkClass("/")}>
        <span className="text-xl">🎮</span>
        <span>Game</span>
      </Link>

      <Link to="/score" className={getLinkClass("/score")}>
        <span className="text-xl">🏆</span>
        <span>Scores</span>
      </Link>

      <Link to="/history" className={getLinkClass("/history")}>
        <span className="text-xl">⏳</span>
        <span>History</span>
      </Link>

      <Link to="/wallet" className={getLinkClass("/wallet")}>
        <span className="text-xl">💳</span>
        <span>Wallet</span>
      </Link>

      <Link to="/profile" className={getLinkClass("/profile")}>
        <span className="text-xl">👤</span>
        <span>Profile</span>
      </Link>
    </div>
  );
}
