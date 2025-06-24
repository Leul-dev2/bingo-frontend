import { useState, useEffect } from 'react';
import { ChevronLeft, RefreshCw, Search, Gamepad, Clock, Wallet, User, ListChecks } from 'lucide-react';

const tabs = ['Last 24 hours', 'Last 7 days', 'Last 30 days', 'All time'];

export default function Score() {
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    // TODO: Replace this static fetch with your async DB/API call
    // e.g. fetch(`/api/players?range=${activeTab}`).then(res => res.json()).then(data => setPlayers(data));
  
    const staticData = [
      { id: '1', name: 'Edase19', phoneMasked: '25191**43582', score: 24 },
      { id: '2', name: 'King', phoneMasked: '25194**44537', score: 18 },
      { id: '3', name: 'Arsenal', phoneMasked: '25192**13933', score: 18 },
      { id: '4', name: 'Natii', phoneMasked: '25191**97323', score: 17 },
      { id: '5', name: 'Aman', phoneMasked: '25194**14383', score: 16 },
    ];
    // simulate async
    setTimeout(() => setPlayers(staticData), 300);
  }, [activeTab]);

  const filtered = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-purple-200">
      {/* Header */}
      <header className="flex items-center px-4 py-2 bg-purple-600 text-white">
        <button><ChevronLeft size={24} /></button>
        <h1 className="flex-1 text-center font-semibold">Addis Bingo</h1>
        <button><ListChecks size={24} /></button>
      </header>

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

          {/* Initials Circles */}
          <div className="flex justify-center space-x-2">
            {['E','K','A','N','A'].map((l,i) => (
              <div key={i} className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {l}
              </div>
            ))}
          </div>

          {/* Players List */}
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
        </div>
      </main>

    
    </div>
  );
}
