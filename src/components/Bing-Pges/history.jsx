import { useState, useEffect } from 'react';
import { ChevronLeft, RefreshCw, Search, Gamepad, Clock, Wallet, User, Award, Calendar } from 'lucide-react';

const historyTabs = ['Recent Games', 'My Games'];
const betTabs = ['10 Birr', '20 Birr', '50 Birr', '100 Birr'];

export default function History() {
  const [activeTab, setActiveTab] = useState(0);
  const [activeBet, setActiveBet] = useState(0);
  const [search, setSearch] = useState('');
  const [games, setGames] = useState([]);

  useEffect(() => {
    // TODO: fetch(`/api/history?tab=${activeTab}&bet=${activeBet}`)
    const staticGames = [
      { id: '1', user: 'mitu', ref: 'YX6622', board: 39, calls: 14, date: '6/23/2025', time: '03:15 PM', win: 384 },
      { id: '2', user: 'MAX IMPACT', ref: 'PE2333', board: 36, calls: 19, date: '6/23/2025', time: '03:14 PM', win: 304 },
      { id: '3', user: 'mitu', ref: 'KT7437', board: 11, calls: 21, date: '6/23/2025', time: '03:13 PM', win: 344 },
      { id: '4', user: 'Semhal', ref: 'NZ5857', board: 28, calls: 17, date: '6/23/2025', time: '03:12 PM', win: 0 },
      // ... more entries as needed
    ];
    setTimeout(() => setGames(staticGames), 300);
  }, [activeTab, activeBet]);

  // filter by game number in ref or id
  const filteredGames = games.filter(g =>
    g.ref.toLowerCase().includes(search.toLowerCase()) ||
    g.id.includes(search)
  );

  return (
    <div className="min-h-screen flex flex-col bg-purple-200">
      {/* Header */}
      <header className="flex items-center px-4 py-2 bg-purple-600 text-white">
        <button><ChevronLeft size={24} /></button>
        <h1 className="flex-1 text-center font-semibold">Addis Bingo</h1>
        <button><RefreshCw size={24} /></button>
      </header>

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
                onClick={() => setActiveTab(idx)}
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

          {/* Bet Amount Tabs */}
          <div className="flex space-x-2">
            {betTabs.map((bet, idx) => (
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
            {filteredGames.map(game => (
              <div
                key={game.id}
                className="bg-purple-400 rounded-lg flex justify-between p-4"
              >
                {/* Left Side: User & Details */}
                <div className="flex items-start space-x-4">
                  <Award className="text-yellow-400 shrink-0" size={28} />
                  <div>
                    <div className="font-semibold text-white text-lg">{game.user}</div>
                    <div className="text-sm text-purple-200">Refs: {game.ref}</div>
                    <div className="text-sm text-purple-200">Board #{game.board}</div>
                    <div className="text-sm text-purple-200">{game.calls} calls</div>
                  </div>
                </div>

                {/* Right Side: Date, Time & Winnings */}
                <div className="flex flex-col items-end space-y-2">
                  <div className="flex items-center space-x-1 text-white text-sm">
                    <Calendar size={16} />
                    <span>{game.date}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-white text-sm">
                    <Clock size={16} />
                    <span>{game.time}</span>
                  </div>
                  <div className="mt-1 px-3 py-1 bg-green-400 rounded-full text-white text-sm font-semibold">
                    {game.win} birr
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

    </div>
  );
}
