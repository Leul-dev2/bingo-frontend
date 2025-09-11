import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const WinnerPage = () => {
  const location = useLocation();
  const { winnerName, prizeAmount, board, winnerPattern, boardNumber, playerCount, telegramId, gameId, GameSessionId } = location.state || {};
  const navigate = useNavigate();

  // Flattens the 2D board and creates a single array for easier mapping
  const flatBoard = board ? board.flat() : [];
  
  // Create a combined data structure for the board cells and their winning status
  const winningBoardCells = flatBoard.map((cell, index) => ({
    number: cell,
    isWinning: winnerPattern ? winnerPattern[index] : false,
  }));

  const renderBingoBoard = (cells) => {
    return (
      <div className="grid grid-cols-5 gap-2 mt-6">
        {cells.map((cell, index) => (
          <div
            key={index}
            className={`text-center p-1  text-md rounded-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-md
              ${cell.isWinning ? 'bg-green-600 text-purple-800' : 'bg-gray-100 text-gray-700'}`
            }
          >
            {cell.number === 0 ? "FREE" : cell.number}
          </div>
        ))}
      </div>
    );
  };

  const playAgain = () => {
    const myTelegramId = localStorage.getItem("telegramId");
    navigate(`/?user=${myTelegramId}&game=${gameId}`);
  };

 return (
  <div className="bg-gradient-to-br from-purple-100 via-pink-100 to-yellow-50 min-h-screen flex flex-col items-center justify-center p-6">
    
    {/* Celebration Header */}
    <div className="text-center mb-10 animate-fade-in">
      <h1 className="text-4xl md:text-5xl font-extrabold text-purple-700 drop-shadow-lg">
        🎉 Congratulations! 🎉
      </h1>
      <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mt-3">
        The Winner is...
      </h2>
    </div>

    {/* Winner & Prize Information Card */}
    <div className="bg-gradient-to-b from-white to-gray-200 p-8 rounded-3xl shadow-2xl w-full max-w-md text-center animate-scale-up">
      <p className="text-4xl md:text-5xl font-black text-yellow-500 drop-shadow mb-4">
        {winnerName}
      </p>
      <div className="flex items-center justify-center gap-2 text-2xl md:text-3xl font-bold text-green-700">
        <span className="tracking-wide">Prize:</span>
        <span className="text-yellow-500">${prizeAmount}</span>
      </div>
    </div>

    {/* Winning Board Display Section */}
    <div className="mt-8 w-full sm:w-4/5 md:w-2/3 max-w-lg animate-slide-up">
      <h3 className="text-center text-xl md:text-2xl font-bold text-purple-700 mb-4">
        Winning Board
      </h3>
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <p className="text-center text-sm font-semibold text-gray-500 mb-3">
          Board Number: <span className="text-gray-700">{boardNumber}</span>
        </p>
        {renderBingoBoard(winningBoardCells)}
      </div>
    </div>

    {/* Action Button */}
    <div className="mt-10 flex justify-center animate-fade-in delay-500">
      <button
        onClick={playAgain}
        className="px-8 py-3 text-lg font-bold text-white rounded-full shadow-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 transform transition duration-300 hover:scale-105 active:scale-95"
      >
        Play Again
      </button>
    </div>
  </div>
);

};

export default WinnerPage;