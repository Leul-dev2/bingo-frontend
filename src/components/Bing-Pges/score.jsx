import { useState, useEffect } from 'react';
import { ChevronLeft, RefreshCw, Search, Gamepad, Clock, Wallet, User, ListChecks } from 'lucide-react';

const tabs = ['Last 24 hours', 'Last 7 days', 'Last 30 days', 'All time'];
const timeKeys = ['24hr', '7days', '30days', 'all']; // maps to backend values

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

        // Mask phone and rename fields
        const maskedPlayers = data.map((p, i) => ({
          id: i + 1,
          name: p.username,
          phoneMasked: p._id.replace(/^(\d{5})\d{3}(\d{2})$/, '$1**$2'), // Basic phone mask
          score: p.gamesPlayed
        }));

        setPlayers(maskedPlayers);
      } catch (err) {
        console.error('Failed to fetch players:', err);
        setPlayers([]);
      }
      setLoading(false);
    };

    fetchPlayers();
  }, [activeTab]);

  const filtered = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-purple-200">
     

      {/* Scoreboard */}
      <main className="flex-1 p-4">
        <div className="bg-purple-300 rounded-xl p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search players..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-purple-200 placeholder-purple-500"
            />
          </div>

          {/* Tabs */}
          <div className="flex space-x-2">
            {tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`flex-1 text-center py-2 rounded-lg transition ${
                  activeTab === i
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-400 text-purple-100'
                }`}
              >
                {tab}
              </button>
            ))}
            <button onClick={() => setActiveTab(activeTab)} className="px-3">
              <RefreshCw />
            </button>
          </div>

         {/* Show only the first player's full name */}
{filtered.length > 0 && (
  <div className="text-center text-white font-bold text-lg mb-4">
    Top Player: {filtered[0].name}
  </div>
)}


          {/* Players List */}
          {loading ? (
            <div className="text-center text-white font-semibold">Loading...</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(p => (
                <div key={p.id} className="bg-purple-400 rounded-lg flex items-center justify-between p-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{p.name}</div>
                      <div className="text-sm text-purple-200">{p.phoneMasked}</div>
                    </div>
                  </div>
                  <div className="text-white font-bold text-xl">{p.score}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
