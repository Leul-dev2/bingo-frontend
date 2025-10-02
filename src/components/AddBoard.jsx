// components/AddBoard.jsx
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import bingoCards from "../assets/bingocards2.json";
import socket from "../../socket"

const AddBoard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    telegramId, 
    gameId, 
    GameSessionId, 
    existingBoards = [],
    countdown: initialCountdown 
  } = location.state || {};

  const [selectedBoard, setSelectedBoard] = useState(null);
  const [takenBoards, setTakenBoards] = useState(new Set());
  const [currentCountdown, setCurrentCountdown] = useState(initialCountdown || 0);
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
  
  const countdownRef = useRef(null);

  // Listen for real-time board selections in current game
  useEffect(() => {
    const handleBoardTaken = ({ cardId, telegramId: takenBy }) => {
      if (takenBy !== telegramId) {
        setTakenBoards(prev => new Set([...prev, cardId]));
      }
    };

    const handleBoardReleased = ({ cardId }) => {
      setTakenBoards(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardId);
        return newSet;
      });
    };

    socket.on("otherCardSelected", handleBoardTaken);
    socket.on("cardReleased", handleBoardReleased);

    return () => {
      socket.off("otherCardSelected", handleBoardTaken);
      socket.off("cardReleased", handleBoardReleased);
    };
  }, [telegramId]);

  // Countdown timer
  useEffect(() => {
    if (initialCountdown && initialCountdown > 0) {
      setCurrentCountdown(initialCountdown);
      
      countdownRef.current = setInterval(() => {
        setCurrentCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            navigate("/game", {
              state: {
                gameId,
                telegramId,
                GameSessionId,
                selectedBoards: existingBoards,
                countdown: 0
              },
              replace: true
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [initialCountdown, navigate, gameId, telegramId, GameSessionId, existingBoards]);

  const isCountdownTooLow = currentCountdown && currentCountdown <= 5;

  const handleBoardSelect = (number) => {
    if (isCountdownTooLow) {
      return;
    }

    const selectedCard = bingoCards.find(card => card.id === number);
    if (!selectedCard) {
      console.error("Card not found for ID:", number);
      return;
    }

    // Check if board is already in use by current user
    const isAlreadySelected = existingBoards.some(board => board.cartelaId === number);
    if (isAlreadySelected) {
      return;
    }

    // Check if board is taken by others in current game
    const isTakenByOthers = takenBoards.has(number);
    if (isTakenByOthers) {
      return;
    }

    setSelectedBoard({
      cartelaId: number,
      cartela: selectedCard.card
    });
  };

  const confirmSelection = () => {
    if (!selectedBoard) {
      return;
    }

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    navigate("/game", {
      state: {
        gameId,
        telegramId,
        GameSessionId,
        selectedBoards: [...existingBoards, selectedBoard],
        countdown: currentCountdown
      },
      replace: true
    });
  };

  const goBack = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    navigate(-1);
  };

  const isBoardTaken = (number) => {
    const inExisting = existingBoards.some(board => board.cartelaId === number);
    const takenByOthers = takenBoards.has(number);
    return inExisting || takenByOthers;
  };

  const getBoardColor = (number) => {
    if (selectedBoard?.cartelaId === number) return "bg-green-500 text-white";
    if (isBoardTaken(number)) return "bg-red-500 text-white cursor-not-allowed";
    if (isCountdownTooLow) return "bg-gray-400 text-white cursor-not-allowed";
    return "bg-white text-black hover:bg-gray-100";
  };

  return (
    <div className="bg-gradient-to-br from-violet-300 via-purple-400 to-indigo-500 min-h-screen p-4 flex flex-col items-center">
      {/* Header */}
      <div className="text-center text-white mb-4">
        <h1 className="text-2xl font-bold mb-2">Add Another Board</h1>
        <p className="text-sm">Select one additional board to play with</p>
        
        {/* Countdown Display */}
        {currentCountdown > 0 && (
          <div className={`px-3 py-1 rounded-full mt-2 text-xs font-bold ${
            currentCountdown <= 5 ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
          }`}>
            Countdown: {currentCountdown}s {currentCountdown <= 5 && '⏰'}
          </div>
        )}
      </div>

      {/* Selected Board Preview */}
      {selectedBoard && (
        <div className="bg-white/20 p-3 rounded-lg mb-4 w-full max-w-md">
          <h3 className="text-white font-semibold mb-2 text-center">Selected Board #{selectedBoard.cartelaId}</h3>
          <div className="grid grid-cols-5 gap-1">
            {selectedBoard.cartela.flat().map((num, idx) => (
              <div 
                key={idx}
                className="bg-white/30 text-white text-xs w-6 h-6 flex items-center justify-center rounded"
              >
                {num === "FREE" ? "⭐" : num}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Board Grid */}
      <div className="grid grid-cols-10 gap-1 py-1 px-2 max-w-lg w-full text-xs mb-4">
        {numbers.map((num) => (
          <button
            key={num}
            onClick={() => handleBoardSelect(num)}
            disabled={isBoardTaken(num) || isCountdownTooLow}
            className={`w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 font-bold cursor-pointer transition-all duration-200 text-xs ${getBoardColor(num)}`}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-4 left-4 right-4 flex gap-3">
        <button
          onClick={goBack}
          className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition"
        >
          Cancel
        </button>
        <button
          onClick={confirmSelection}
          disabled={!selectedBoard || isCountdownTooLow}
          className={`flex-1 py-3 rounded-lg font-semibold transition ${
            !selectedBoard || isCountdownTooLow
              ? "bg-gray-500 cursor-not-allowed text-gray-300" 
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          {selectedBoard ? `Add Board #${selectedBoard.cartelaId}` : "Add Board"}
        </button>
      </div>

      {/* Auto-return Overlay */}
      {isCountdownTooLow && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 text-center">
            <div className="text-4xl mb-3">⏰</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Time's Up!</h3>
            <p className="text-gray-600 mb-4">
              Returning to game...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddBoard;