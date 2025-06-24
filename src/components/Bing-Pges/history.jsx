import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, RefreshCw, Search, Clock, Award, Calendar } from 'lucide-react';

const historyTabs = ['Recent Games', 'My Games'];
const betTabs = ['10 Birr', '20 Birr', '50 Birr', '100 Birr'];
const betValues = ['10', '20', '50', '100'];

const resultTabs = ['All', 'Win', 'Lose'];

export default function History() {
  const [searchParams] = useSearchParams();
  const urlTelegramId = searchParams.get("user");
  const urlGameChoice = searchParams.get("game");

  const [activeTab, setActiveTab] = useState(0);
  const [activeBet, setActiveBet] = useState(0);
  const [activeResult, setActiveResult] = useState(0); // 0 = All, 1 = Win, 2 = Lose
  const [search, setSearch] = useState('');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const telegramId = urlTelegramId || localStorage.getItem("telegramId");
  const gameChoice = urlGameChoice || localStorage.getItem("gameChoice");
  const selectedBet = betValues[activeBet];

  useEffect(() => {
    const fetchGames = async () => {
      if (!telegramId || (activeTab === 0 && !selectedBet)) return;
      setLoading(true);

      try {
        const res = await fetch(
          `https://bingobot-backend-bwdo.onrender.com/api/history?user=${telegramId}&bet=${selectedBet}&tab=${activeTab}`
        );
        const data = await res.json();
        setGames(data);
      } catch (err) {
        console.error('Failed to fetch history:', err);
        setGames([]);
      }

      setLoading(false);
    };

    fetchGames();
  }, [activeTab, activeBet]);

  const filteredGames = games
    .filter(g =>
      g.ref.toLowerCase().includes(search.toLowerCase()) ||
      g.id?.toString().includes(search)
    )
    .filter(g => {
      if (activeTab === 1) {
        if (activeResult === 1) return g.win > 0;
        if (activeResult === 2) return g.win === 0;
      }
      return true;
    });

  return (
    <div className="min-h-screen flex flex-col bg-purple-200">
      
      {/* Title */}
      <div className="px-4 mt-4 flex items-center justify-center space-x-2">
        <h2 className="text-2xl font-semibold text-white">Bingo History</h2>
        <RefreshCw className="text-white" size={20} />
      </div>

      <main className="flex-1 p-4 space-y-4">
        <div className="bg-purple-300 rounded-xl p-4 space-y-4">
          {/* History Tabs */}
          <div className="flex space-x-2">
            {historyTabs.map((tab, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveTab(idx);
                  setActiveBet(0);
                  setActiveResult(0);
                }}
                className={`flex-1 py-2 rounded-lg text-center font-medium transition ${
                  activeTab === idx
                    ? 'bg-white text-purple-600'
                    : 'bg-purple-400 text-purple-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Bet or Result Filter Tabs */}
          <div className="flex space-x-2">
            {activeTab === 0
              ? betTabs.map((bet, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveBet(idx)}
                    className={`flex-1 py-2 rounded-lg text-center font-medium transition ${
                      activeBet === idx
                        ? 'bg-white text-purple-600'
                        : 'bg-purple-400 text-purple-100'
                    }`}
                  >
                    {bet}
                  </button>
                ))
              : resultTabs.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveResult(idx)}
                    className={`flex-1 py-2 rounded-lg text-center font-medium transition ${
                      activeResult === idx
                        ? 'bg-white text-purple-600'
                        : 'bg-purple-400 text-purple-100'
                    }`}
                  >
                    {res}
                  </button>
                ))}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by game number..."
              className="w-full pl-10 py-2 rounded-lg bg-purple-200 placeholder-purple-500"
            />
          </div>

          {/* Games List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center text-white font-semibold">Loading...</div>
            ) : filteredGames.length === 0 ? (
              <div className="text-center text-white font-semibold">No history found.</div>
            ) : (
              filteredGames.map(game => (
                <div
                  key={game.ref}
                  className="bg-purple-400 rounded-lg flex justify-between p-4"
                >
                  {/* Left Side */}
                  <div className="flex items-start space-x-4">
                    <Award className="text-yellow-400 shrink-0" size={28} />
                    <div>
                      <div className="font-semibold text-white text-lg">{game.user}</div>
                      <div className="text-sm text-purple-200">Refs: {game.ref}</div>
                      <div className="text-sm text-purple-200">Board #{game.board}</div>
                      <div className="text-sm text-purple-200">{game.calls} calls</div>
                    </div>
                  </div>

                  {/* Right Side */}
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center space-x-1 text-white text-sm">
                      <Calendar size={16} />
                      <span>{game.date}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-white text-sm">
                      <Clock size={16} />
                      <span>{game.time}</span>
                    </div>

                    {activeTab === 1 ? (
                      <>
                        <div className={`mt-1 px-3 py-1 rounded-full text-sm font-semibold ${
                          game.win > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                          {game.win > 0 ? 'WIN ✅' : 'LOSE ❌'}
                        </div>
                        <div className="text-xs text-white font-medium">{game.win} birr</div>
                      </>
                    ) : (
                      <div className="mt-1 px-3 py-1 bg-green-400 rounded-full text-white text-sm font-semibold">
                        {game.win} birr
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
