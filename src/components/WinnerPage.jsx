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
    <div className="bg-purple-100 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      
      {/* Celebration Header */}
      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-3xl sm:text-2xl md:text-3xl font-extrabold text-purple-700 leading-tight">
          🎉 Congratulations!
        </h1>
        <h2 className="text-xl sm:text-xl font-semibold text-gray-800 mt-4">
          The winner is...
        </h2>
      </div>

      {/* Winner & Prize Information Card */}
      <div className="bg-gradient-to-b from-white to-gray-300 p-2 rounded-2xl shadow-xl w-full max-w-sm text-center transform scale-100 transition-transform duration-500 ease-out animate-scale-up">
        <p className="text-3xl sm:text-4xl font-black text-yellow-500 mb-2">
          {winnerName}
        </p>
        <div className="flex items-center justify-center space-x-2 text-2xl sm:text-3xl font-bold text-green-600">
          <span>Prize:</span>
          <span className="text-yellow-500">${prizeAmount}</span>
        </div>
      </div>

      {/* Winning Board Display Section */}
      <div className="mt-3 w-full sm:w-4/5 md:w-2/3  max-w-lg animate-slide-up">
        <h3 className="text-center text-xl font-bold text-purple-700 mb-4">
          Winning Board
        </h3>
        <div className="bg-white p-2 rounded-2xl shadow-xl">
          <p className="text-center text-sm font-semibold text-gray-500 mb-2">
            Board Number: {boardNumber}
          </p>
        
          {renderBingoBoard(winningBoardCells)}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-col sm:flex-row gap-4 w-full max-w-xs animate-fade-in delay-500">
        <button
          onClick={() => playAgain()}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105"
        >
          Play Again
        </button>
      </div>

    </div>
  );
};

export default WinnerPage;