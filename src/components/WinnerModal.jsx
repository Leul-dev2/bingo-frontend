// src/components/WinnerModal.js
import React from 'react';

const WinnerModal = ({ isOpen, onClose, winnerInfo }) => {
  if (!isOpen || !winnerInfo) {
    return null; // Don't render if not open or no info
  }

  // Destructure winnerInfo passed as a prop
  const { winnerName, prizeAmount, board, winnerPattern, boardNumber, playerCount, gameId, telegramId } = winnerInfo;

  // Function to render Bingo board with highlighted winning numbers
  const renderBingoBoard = (board, winnerPattern) => {
    // Ensure board is valid and has a flat method
    const flatBoard = board?.flat() || [];

    return (
      <div className="grid grid-cols-5 gap-2 mt-6">
        {flatBoard.map((cell, index) => {
          const isWinning = winnerPattern ? winnerPattern[index] : false; // Check if winnerPattern exists
          const displayCell = cell === 0 ? "FREE" : cell;
          return (
            <div
              key={index}
              className={`text-center p-4 border-2 rounded-lg ${
                isWinning ? 'bg-yellow-500 text-white' : 'bg-white'
              }`}
            >
              {displayCell}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    // This div acts as the modal overlay
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-lg w-full transform transition-all scale-100 opacity-100">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-blue-600 mb-4 sm:mb-6">
          Winner Announcement
        </h1>

        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-green-600">
            Congratulations, {winnerName || 'Player'}!
          </h2>
          <p className="text-base sm:text-xl mt-2 text-gray-800">
            Total Players: {playerCount}
          </p>
          <p className="text-base sm:text-lg mt-2 text-gray-700">
            Prize Amount:{" "}
            <span className="font-bold text-xl text-yellow-600">${prizeAmount}</span>
          </p>
          {/* Using boardNumber for Game ID as per your original code */}
          <p className="text-sm mt-4 text-gray-600">Game ID: {gameId} (Card: {boardNumber})</p>
          {winnerInfo.sessionId && (
            <p className="text-xs text-gray-400 mt-2">Session ID: {winnerInfo.sessionId.substring(0, 10)}...</p>
          )}
        </div>

        {/* Winning Pattern Display (using the render function) */}
        {board && winnerPattern && ( // Ensure both exist before rendering
          <div className="w-full mx-auto bg-gray-100 p-4 sm:p-6 rounded-md shadow-inner">
            <h4 className="text-base sm:text-lg font-semibold text-blue-500 text-center mb-4">
              Winning Board & Pattern
            </h4>
            {renderBingoBoard(board, winnerPattern)}
          </div>
        )}

        {/* Close Button for the Modal */}
        <div className="text-center mt-6">
          <button
            onClick={onClose} // Call the onClose prop to close the modal
            className="bg-purple-600 text-white px-5 sm:px-6 py-2 rounded-lg shadow-md hover:bg-purple-700 transition duration-300"
          >
            Continue Game
          </button>
          {/* You could add a "Play Another Round" button here that also calls onClose
              and then triggers a 'joinGame' or navigation to a game selection screen */}
        </div>
      </div>
    </div>
  );
};

export default WinnerModal;