import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, RefreshCw, Search, Clock, Award, Calendar } from 'lucide-react';

const historyTabs = ['Recent Games', 'My Games'];
const betTabs = ['10 Birr', '20 Birr', '50 Birr', '100 Birr'];
const betValues = ['10', '20', '50', '100'];

export default function History({ isBlackToggleOn }) {
  const [searchParams] = useSearchParams();
  const urlTelegramId = searchParams.get('user');
  const urlGameChoice = searchParams.get('game');

  const [activeTab, setActiveTab] = useState(0);
  const [activeBet, setActiveBet] = useState(0);
  const [search, setSearch] = useState('');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // NEW states for rate limit info:
  const [retryAfter, setRetryAfter] = useState(0);
  const [rateLimitError, setRateLimitError] = useState('');

  const telegramId = urlTelegramId || localStorage.getItem('telegramId');
  const selectedBet = betValues[activeBet];

  // Countdown timer for retryAfter
  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setTimeout(() => setRetryAfter(retryAfter - 1), 1000);
    return () => clearTimeout(timer);
  }, [retryAfter]);

  useEffect(() => {
    const fetchGames = async () => {
      if (!telegramId) return;
      setLoading(true);
      setRateLimitError('');
      setRetryAfter(0);

      try {
        const res = await fetch(
          `https://api.bingoogame.com/api/history?user=${telegramId}&bet=${selectedBet}&tab=${activeTab}`
        );

        if (res.status === 429) {
          // Rate limit hit, parse error and retryAfter from server if present
          const json = await res.json();
          setRateLimitError(json.error || 'Too many requests. Please wait before trying again.');
          setRetryAfter(json.retryAfter || 5); // default 5 seconds if not specified
          setGames([]); // clear data while rate-limited
          setLoading(false);
          return; // Skip further parsing
        }

        const data = await res.json();
        setGames(data);
        setLoading(false);
      } catch (error) {
        setGames([]);
        setLoading(false);
      }
    };

    if (retryAfter === 0) {
      fetchGames();
    }
  }, [activeTab, activeBet, retryAfter, telegramId, selectedBet]);

const filteredGames = games
  // Show only wins if tab is 'My Games' (activeTab !== 0)
  .filter(g => activeTab !== 0 ? Number(g.win) > 0 : true)
  // Filter by username or ref
  .filter(g =>
    (g.user || '')       // username
      .toLowerCase()
      .includes(search.toLowerCase()) ||
    (g.ref || '')        // fallback ref
      .toLowerCase()
      .includes(search.toLowerCase())
  );


  // Backgrounds and text colors based on toggle
  const containerBg = isBlackToggleOn
    ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900'
    : 'bg-gradient-to-br from-purple-200 via-purple-300 to-purple-200';

  const cardBg = isBlackToggleOn ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800';

  const activeBtnBg = isBlackToggleOn ? 'bg-indigo-700 text-white shadow-inner' : 'bg-purple-600 text-white shadow-inner';
  const inactiveBtnBg = isBlackToggleOn ? 'bg-gray-700 text-gray-300' : 'bg-purple-100 text-purple-700';

  const textPrimary = isBlackToggleOn ? 'text-gray-100' : 'text-purple-700';
  const textSecondary = isBlackToggleOn ? 'text-gray-400' : 'text-purple-500';
  const textBody = isBlackToggleOn ? 'text-gray-300' : 'text-gray-800';
  const textSubtle = isBlackToggleOn ? 'text-gray-500' : 'text-gray-500';

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
          <h1 className={`text-xl font-bold ${textPrimary}`}>Bingo History</h1>
          <motion.button
            whileTap={{ rotate: 360 }}
            className="p-2 bg-purple-600 text-white rounded-lg shadow-md"
            onClick={() => setActiveBet(activeBet)}
          >
            <RefreshCw />
          </motion.button>
        </div>

        {/* Rate Limit Banner */}
        <AnimatePresence>
          {retryAfter > 0 && (
            <motion.div
              key="rate-limit-banner"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center gap-3 px-4 py-2 rounded-full shadow-md 
                         bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 text-yellow-900 mb-4"
            >
              <RefreshCw className="w-5 h-5 animate-spin-slow text-yellow-800" />
              <span className="font-medium">{rateLimitError} Retry in <strong>{retryAfter}</strong> second{retryAfter > 1 ? 's' : ''}.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="relative">
          <Search className={`absolute top-1/2 left-4 transform -translate-y-1/2 ${textSecondary}`} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ref or ID..."
            className={`w-full pl-12 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
              isBlackToggleOn
                ? 'border-gray-600 bg-gray-900 text-gray-200 focus:ring-indigo-600'
                : 'border-purple-300 bg-white text-gray-800 focus:ring-purple-500'
            }`}
          />
        </div>

        {/* History Tabs */}
        <div className="flex space-x-2 overflow-auto">
          {historyTabs.map((tab, idx) => (
            <motion.button
              key={idx}
              onClick={() => setActiveTab(idx)}
              whileTap={{ scale: 0.95 }}
              className={`flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === idx ? activeBtnBg : inactiveBtnBg
              }`}
            >
              {tab}
            </motion.button>
          ))}
        </div>

        {/* Bet Tabs */}
        <div className="flex space-x-2 overflow-auto">
          {betTabs.map((bet, idx) => (
            <motion.button
              key={idx}
              onClick={() => setActiveBet(idx)}
              whileTap={{ scale: 0.95 }}
              className={`flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors ${
                activeBet === idx ? activeBtnBg : inactiveBtnBg
              }`}
            >
              {bet}
            </motion.button>
          ))}
        </div>

        {/* Games List or Loading */}
        <div>
          {loading ? (
            <div className="flex justify-center py-10 space-x-3">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-8 h-8 rounded-full shadow-md animate-pulse ${
                    isBlackToggleOn
                      ? 'bg-gray-700'
                      : 'bg-gradient-to-br from-purple-400 to-pink-400'
                  }`}
                  initial={{ scale: 0.6, opacity: 0.7 }}
                  animate={{ scale: [0.6, 1, 0.6], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
                />
              ))}
            </div>
          ) : filteredGames.length === 0 ? (
            <motion.div
              className={`text-center font-semibold py-10 ${textPrimary}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              No history found.
            </motion.div>
          ) : (
            <motion.ul className="space-y-4">
              {filteredGames.map((game, idx) => (
                <motion.li
                  key={game.ref}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`rounded-lg p-4 shadow-md flex justify-between ${cardBg}`}
                >
                  <div className="flex items-start space-x-3">
                    <Award className="text-yellow-400" size={28} />
                    <div>
                      <div className={`font-semibold ${textBody} text-lg`}>{game.user}</div>
                      <div className={`text-sm ${textSubtle}`}>Refs: {game.ref}</div>
                      <div className={`text-sm ${textSubtle}`}>Board #{game.board}</div>
                      <div className={`text-sm ${textSubtle}`}>{game.calls} calls</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className={`flex items-center space-x-1 text-sm ${textSubtle}`}>
                      <Calendar size={16} /> <span>{game.date}</span>
                    </div>
                    <div className={`flex items-center space-x-1 text-sm ${textSubtle}`}>
                      <Clock size={16} /> <span>{game.time}</span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${
                        Number(game.win) > 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      {Number(game.win) > 0 ? 'WIN ✅' : 'LOSE ❌'}
                    </span>
                    <span className={`${textBody} text-sm font-semibold`}>
                      {Number(game.win) > 0 ? `+${game.win} birr` : `-${Math.abs(game.win)} birr`}
                    </span>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </div>
      </div>
    </div>
  );
}
