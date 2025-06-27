import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, RefreshCw, Search } from 'lucide-react';

const tabs = ['Last 24 hours', 'Last 7 days', 'Last 30 days', 'All time'];
const timeKeys = ['24hr', '7days', '30days', 'all'];

export default function Score() {
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://bingobot-backend-bwdo.onrender.com/api/Score?time=${timeKeys[activeTab]}`);
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
    fetchPlayers();
  }, [activeTab]);

  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-purple-300 to-purple-200 p-4">
      <div className="max-w-lg mx-auto bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <motion.button whileTap={{ scale: 0.9 }} className="p-2 bg-purple-600 text-white rounded-lg shadow-md" onClick={() => setActiveTab(0)}>
            <ChevronLeft />
          </motion.button>
          <h1 className="text-xl font-bold text-purple-700">Scoreboard</h1>
          <motion.button whileTap={{ rotate: 360 }} className="p-2 bg-purple-600 text-white rounded-lg shadow-md" onClick={() => setActiveTab(activeTab)}>
            <RefreshCw />
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 left-4 transform -translate-y-1/2 text-purple-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search players..."
            className="w-full pl-12 pr-4 py-2 rounded-lg border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                activeTab === i ? 'bg-purple-600 text-white shadow-inner' : 'bg-purple-100 text-purple-700'
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
              className="flex items-center space-x-4 bg-gradient-to-r from-purple-700 to-indigo-700 rounded-xl p-4 text-white shadow-lg"
            >
              <div className="text-4xl">👑</div>
              <div>
                <div className="text-sm uppercase opacity-75">Top Player</div>
                <div className="text-2xl font-extrabold truncate">{filtered[0].name}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Players List or Animated Loader */}
        {loading ? (
        <div className="flex space-x-2 justify-center py-8">
  {[...Array(3)].map((_, i) => (
    <motion.div
      key={i}
      className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 shadow-md"
      initial={{ scale: 0.6, opacity: 0.6 }}
      animate={{ scale: [0.6, 1, 0.6], opacity: [0.6, 1, 0.6] }}
      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
    />
  ))}
</div>

        ) : (
          <motion.ul className="space-y-3">
            {filtered.map(p => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: p.id * 0.05 }}
                className="flex items-center justify-between bg-white rounded-lg p-3 shadow-md"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{p.name}</div>
                    <div className="text-sm text-gray-400">{p.phoneMasked}</div>
                  </div>
                </div>
                <div className="text-xl font-bold text-purple-600">{p.score}</div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </div>
  );
}
