import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FaGamepad, FaTrophy, FaHistory, FaWallet, FaUser } from "react-icons/fa";

const tabs = [
  { path: "/", label: "Game", icon: <FaGamepad /> },
  { path: "/score", label: "Scores", icon: <FaTrophy /> },
  { path: "/history", label: "History", icon: <FaHistory /> },
  { path: "/wallet", label: "Wallet", icon: <FaWallet /> },
  { path: "/profile", label: "Profile", icon: <FaUser /> },
];

export default function Nav() {
  const location = useLocation();
  const current = tabs.findIndex(tab => tab.path === location.pathname);
  const navHeight = 64; // px
  const tabWidth = 100 / tabs.length; // percent

  return (
    <>
      {/* Spacer */}
      <div style={{ height: navHeight }} className="w-full" />

      <nav
        className="fixed bottom-0 left-0 w-full h-16 bg-gradient-to-br from-white via-purple-50 to-purple-100 backdrop-blur-md shadow-lg border-t border-purple-200"
      >
        <div className="relative h-full flex">
          {/* Active indicator */}
          <motion.div
            key={location.pathname}
            className="absolute top-0 h-1.5 bg-purple-500 rounded-full"
            style={{
              width: `${tabWidth}%`,
              left: `${current * tabWidth}%`
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />

          {tabs.map((tab, idx) => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex-1 flex flex-col items-center justify-center space-y-1 transition-colors duration-200 ${
                  isActive ? "text-purple-600" : "text-gray-600 hover:text-purple-500"
                }`}
              >
                <span className="text-2xl">
                  {tab.icon}
                </span>
                <span className="text-xs font-medium">
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
