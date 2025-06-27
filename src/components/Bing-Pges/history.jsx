import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, RefreshCw, Search, Clock, Award, Calendar } from 'lucide-react';

const historyTabs = ['Recent Games', 'My Games'];
const betTabs = ['10 Birr', '20 Birr', '50 Birr', '100 Birr'];
const betValues = ['10', '20', '50', '100'];

export default function History() {
  const [searchParams] = useSearchParams();
  const urlTelegramId = searchParams.get('user');
  const urlGameChoice = searchParams.get('game');

  const [activeTab, setActiveTab] = useState(0);
  const [activeBet, setActiveBet] = useState(0);
  const [search, setSearch] = useState('');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const telegramId = urlTelegramId || localStorage.getItem('telegramId');
  const selectedBet = betValues[activeBet];

  useEffect(() => {
    const fetchGames = async () => {
      if (!telegramId) return;
      setLoading(true);
      try {
        const res = await fetch(
          `https://bingobot-backend-bwdo.onrender.com/api/history?user=${telegramId}&bet=${selectedBet}&tab=${activeTab}`
        );
        const data = await res.json();
        setGames(data);
      } catch {
        setGames([]);
      }
      setLoading(false);
    };
    fetchGames();
  }, [activeTab, activeBet]);

  const filteredGames = games
    .filter(g => activeTab !== 0 || Number(g.win) > 0)
    .filter(g =>
      g.ref.toLowerCase().includes(search.toLowerCase()) ||
      g.id.toString().includes(search)
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-purple-300 to-purple-200 p-4">
      <div className="max-w-lg mx-auto bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <motion.button whileTap={{ scale: 0.9 }} className="p-2 bg-purple-600 text-white rounded-lg shadow-md" onClick={() => setActiveTab(0)}>
            <ChevronLeft />
          </motion.button>
          <h1 className="text-xl font-bold text-purple-700">Bingo History</h1>
          <motion.button whileTap={{ rotate: 360 }} className="p-2 bg-purple-600 text-white rounded-lg shadow-md" onClick={() => setActiveBet(activeBet)}>
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
            placeholder="Search by ref or ID..."
            className="w-full pl-12 pr-4 py-2 rounded-lg border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 overflow-auto">
          {historyTabs.map((tab, idx) => (
            <motion.button
              key={idx}
              onClick={() => setActiveTab(idx)}
              whileTap={{ scale: 0.95 }}
              className={`flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === idx
                  ? 'bg-purple-600 text-white shadow-inner'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {tab}
            </motion.button>
          ))}
        </div>

        <div className="flex space-x-2 overflow-auto">
          {betTabs.map((bet, idx) => (
            <motion.button
              key={idx}
              onClick={() => setActiveBet(idx)}
              whileTap={{ scale: 0.95 }}
              className={`flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors ${
                activeBet === idx
                  ? 'bg-purple-600 text-white shadow-inner'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {bet}
            </motion.button>
          ))}
        </div>

        {/* Games List or Loading Animation */}
        <div>
          {loading ? (
            <div className="flex justify-center py-10 space-x-3">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full shadow-md"
                  initial={{ scale: 0.6, opacity: 0.7 }}
                  animate={{ scale: [0.6, 1, 0.6], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
                />
              ))}
            </div>
          ) : filteredGames.length === 0 ? (
            <motion.div
              className="text-center text-purple-600 font-semibold py-10"
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
                  className="bg-white rounded-lg p-4 shadow-md flex justify-between"
                >
                  <div className="flex items-start space-x-3">
                    <Award className="text-yellow-400" size={28} />
                    <div>
                      <div className="font-semibold text-gray-800 text-lg">{game.user}</div>
                      <div className="text-sm text-gray-500">Refs: {game.ref}</div>
                      <div className="text-sm text-gray-500">Board #{game.board}</div>
                      <div className="text-sm text-gray-500">{game.calls} calls</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center space-x-1 text-gray-500 text-sm">
                      <Calendar size={16} /> <span>{game.date}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-500 text-sm">
                      <Clock size={16} /> <span>{game.time}</span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${
                        Number(game.win) > 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      {Number(game.win) > 0 ? 'WIN ✅' : 'LOSE ❌'}
                    </span>
                    <span className="text-gray-700 text-sm font-semibold">{game.win} birr</span>
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
