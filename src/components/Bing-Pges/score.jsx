import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, RefreshCw, Search } from 'lucide-react';

const tabs = ['Last 24 hours', 'Last 7 days', 'Last 30 days', 'All time'];
const timeKeys = ['24hr', '7days', '30days', 'all'];

export default function Score({ isBlackToggleOn }) {
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0); // NEW state for retry countdown

  useEffect(() => {
    let countdownTimer;

    if (retryAfter > 0) {
      countdownTimer = setTimeout(() => {
        setRetryAfter(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }

    return () => clearTimeout(countdownTimer);
  }, [retryAfter]);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://api.bingoogame.com/api/Score?time=${timeKeys[activeTab]}`);

        if (res.status === 429) {
          const { retryAfter: serverRetry, error } = await res.json();
          setRetryAfter(serverRetry || 5);
          console.warn(error || 'Rate limit exceeded');
          setPlayers([]); // clear players list while waiting
          setLoading(false);
          return;
        }

        const data = await res.json();
        const masked = data.map((p, i) => ({
          id: i + 1,
          name: p.username,
          phoneMasked: p._id.replace(/^(\d{5})\d{3}(\d{2})$/, '$1**$2'),
          score: p.gamesPlayed
        }));
        setPlayers(masked);
      } catch {
        setPlayers([]);
      }
      setLoading(false);
    };

    if (retryAfter === 0) {
      fetchPlayers();
    }
  }, [activeTab, retryAfter]);

  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  // Conditional classes for dark mode toggle
  const containerBg = isBlackToggleOn
    ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900'
    : 'bg-gradient-to-br from-purple-200 via-purple-300 to-purple-200';

  const cardBg = isBlackToggleOn ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800';

  const btnActiveBg = isBlackToggleOn ? 'bg-indigo-700 text-white shadow-inner' : 'bg-purple-600 text-white shadow-inner';
  const btnInactiveBg = isBlackToggleOn ? 'bg-gray-700 text-gray-300' : 'bg-purple-100 text-purple-700';

  const scoreTextColor = isBlackToggleOn ? 'text-indigo-400' : 'text-purple-600';

  return (
    <div className={`min-h-screen p-4 ${containerBg}`}>
      <div className={`max-w-lg mx-auto backdrop-blur-md rounded-2xl shadow-xl p-6 space-y-6 ${cardBg}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="p-2 bg-purple-600 text-white rounded-lg shadow-md"
            onClick={() => setActiveTab(0)}
          >
            <ChevronLeft />
          </motion.button>
          <h1 className={`text-xl font-bold ${isBlackToggleOn ? 'text-gray-100' : 'text-purple-700'}`}>
            Scoreboard
          </h1>
          <motion.button
            whileTap={{ rotate: 360 }}
            className="p-2 bg-purple-600 text-white rounded-lg shadow-md"
            onClick={() => setActiveTab(activeTab)}
          >
            <RefreshCw />
          </motion.button>
        </div>

      {/* Retry Banner */}
<AnimatePresence>
  {retryAfter > 0 && (
    <motion.div
      key="retry-banner"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-center gap-3 px-4 py-2 rounded-full shadow-md 
                 bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 text-yellow-900"
    >
      <RefreshCw className="w-5 h-5 animate-spin-slow text-yellow-800" />
      <span className="font-medium">
        Too many requests — retry in{" "}
        <span className="font-bold">{retryAfter}</span>{" "}
        second{retryAfter > 1 ? "s" : ""}
      </span>
    </motion.div>
  )}
</AnimatePresence>

        {/* Search */}
        <div className="relative">
          <Search
            className={`absolute top-1/2 left-4 transform -translate-y-1/2 ${
              isBlackToggleOn ? 'text-gray-400' : 'text-purple-500'
            }`}
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search players..."
            className={`w-full pl-12 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
              isBlackToggleOn
                ? 'border-gray-600 bg-gray-900 text-gray-200 focus:ring-indigo-600'
                : 'border-purple-300 bg-white text-gray-800 focus:ring-purple-500'
            }`}
          />
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 overflow-auto">
          {tabs.map((tab, i) => (
            <motion.button
              key={i}
              onClick={() => setActiveTab(i)}
              whileTap={{ scale: 0.95 }}
              className={`flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === i ? btnActiveBg : btnInactiveBg
              }`}
            >
              {tab}
            </motion.button>
          ))}
        </div>

        {/* Top Player */}
        <AnimatePresence>
          {filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-center space-x-4 rounded-xl p-4 shadow-lg ${
                isBlackToggleOn ? 'bg-gradient-to-r from-gray-700 to-gray-900 text-gray-100' : 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white'
              }`}
            >
              <div className="text-4xl">👑</div>
              <div>
                <div className="text-sm uppercase opacity-75">Top Player</div>
                <div className="text-2xl font-extrabold truncate">{filtered[0].name}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Players List or Loader */}
        {loading ? (
          <div className="flex space-x-2 justify-center py-8">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className={`w-6 h-6 rounded-full shadow-md animate-pulse ${
                  isBlackToggleOn
                    ? 'bg-gray-700'
                    : 'bg-gradient-to-br from-purple-400 to-pink-400'
                }`}
                initial={{ scale: 0.6, opacity: 0.6 }}
                animate={{ scale: [0.6, 1, 0.6], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
              />
            ))}
          </div>
        ) : (
          <motion.ul className="space-y-3">
            {filtered.map((p) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: p.id * 0.05 }}
                className={`flex items-center justify-between rounded-lg p-3 shadow-md ${cardBg}`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      isBlackToggleOn ? 'bg-gray-700 text-gray-300' : 'bg-purple-500 text-white'
                    }`}
                  >
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <div className={`${isBlackToggleOn ? 'text-gray-300' : 'text-gray-800'} font-semibold`}>
                      {p.name}
                    </div>
                    <div className={`${isBlackToggleOn ? 'text-gray-500' : 'text-gray-400'} text-sm`}>
                      {p.phoneMasked}
                    </div>
                  </div>
                </div>
                <div className={`text-xl font-bold ${scoreTextColor}`}>{p.score}</div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </div>
  );
}
