import React from 'react';
import { useLocation } from 'react-router-dom';

const WinnerPage = () => {
  const location = useLocation();
  const { winnerName, prizeAmount, board, winnerPattern, boardNumber, playerCount } = location.state || {};
  console.log("winnerpatern",winnerPattern);
  console.log("board",board);

  // Function to render Bingo board with highlighted winning numbers
  const renderBingoBoard = (board, winnerPattern) => {
    return (
      <div className="grid grid-cols-5 gap-2 mt-6">
        {board.map((cell, index) => (
          <div
            key={index}
            className={`text-center p-4 border-2 rounded-lg ${winnerPattern[index] ? 'bg-yellow-500 text-white' : 'bg-white'}`}
          >
            {cell.value === "FREE" ? "FREE" : cell.value} {/* Display cell value or "FREE" */}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 rounded-lg">
      <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">Winner Announcement</h1>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-green-600">Congratulations, {winnerName}!</h2>
        <p className="text-xl mt-2 text-gray-800">playerCount, {playerCount}</p>
        <p className="text-lg mt-2 text-gray-700">Prize Amount: <span className="font-bold text-xl text-yellow-600">${prizeAmount}</span></p>
        <p className="text-md mt-4 text-gray-600">Game ID: {boardNumber}</p>
      </div>


      {/* Winning Pattern Display */}
      {/* Winning Pattern Display */}
        <div className="text-center mt-8 w-1/3 mx-auto bg-white p-3 rounded-md shadow-xl">
        <h4 className="text-lg font-semibold text-blue-500">Winning Pattern</h4>
        <div className="grid grid-cols-5 gap-2 mt-4">
        {winnerPattern.map((isWinning, index) => {
          // Flatten the board to a 1D array
          const flatBoard = board?.flat() || [];

          // Get the number for the current index
          const number = flatBoard[index]?.value || "?";

          return (
            <div
              key={index}
              className={`w-12 h-12 flex items-center justify-center font-bold text-lg border rounded-lg shadow-md cursor-pointer 
              ${isWinning ? "bg-green-500 text-black" : "bg-gray-200"}`}
            >
              {number} {/* Display the board number */}
            </div>
          );
        })}
        </div>
        </div>


      {/* Play Again Button */}
      <div className="text-center mt-6">
        <button
          onClick={() => window.location.href = '/'} // Redirect to home or main game page
          className="bg-blue-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-600 transition duration-300"
        >
          Play Again
        </button>
      </div>
    </div>
  );
};

export default WinnerPage;
