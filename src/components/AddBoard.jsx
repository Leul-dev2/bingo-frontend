// components/AddBoard.jsx
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import bingoCards from "../assets/bingoCards2.json";
import socket from "../../socket";

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
  
  const countdownRef = useRef(null);
  const lastRequestIdRef = useRef(0);
  const emitLockRef = useRef(false);

  // ✅ FIXED: Listen for real-time board selections in current game
  useEffect(() => {
    const handleBoardTaken = ({ cardId, telegramId: takenBy }) => {
      console.log(`🎯 Board ${cardId} taken by ${takenBy}`);
      if (takenBy !== telegramId) {
        setTakenBoards(prev => new Set([...prev, cardId]));
      }
    };

    const handleBoardReleased = ({ cardId }) => {
      console.log(`🎯 Board ${cardId} released`);
      setTakenBoards(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardId);
        return newSet;
      });
    };

    const handleCardConfirmed = (data) => {
      // Only process if it's not our own confirmation
      if (data.telegramId !== telegramId && data.requestId !== lastRequestIdRef.current) {
        console.log(`🎯 Board ${data.cardId} confirmed by ${data.telegramId}`);
        setTakenBoards(prev => new Set([...prev, data.cardId]));
      }
    };

    const handleCardError = ({ message, requestId }) => {
      if (requestId === lastRequestIdRef.current) {
        setError(message || "Card selection failed");
        setIsLoading(false);
        emitLockRef.current = false;
      }
    };

    const handleCardUnavailable = ({ cardId, requestId }) => {
      if (requestId === lastRequestIdRef.current) {
        setError(`Board ${cardId} is no longer available`);
        setIsLoading(false);
        emitLockRef.current = false;
        setSelectedBoard(null);
      }
    };

    const handleInitialCardStates = (data) => {
      const { takenCards } = data;
      const newTakenBoards = new Set();
      
      for (const cardId in takenCards) {
        const takenByTelegramId = takenCards[cardId];
        if (takenByTelegramId !== telegramId) {
          newTakenBoards.add(Number(cardId));
        }
      }
      
      setTakenBoards(newTakenBoards);
      console.log("🎯 Initial taken boards:", Array.from(newTakenBoards));
    };

    const handleSocketError = (error) => {
      console.error("Socket error in AddBoard:", error);
      setError("Connection error. Please try again.");
    };

    const handleSocketConnect = () => {
      console.log("✅ Socket reconnected in AddBoard");
      setError(null);
      // Re-fetch initial card states when reconnected
      socket.emit("getInitialCardStates", { gameId });
    };

    // Request initial card states
    socket.emit("getInitialCardStates", { gameId });

    socket.on("otherCardSelected", handleBoardTaken);
    socket.on("cardReleased", handleBoardReleased);
    socket.on("cardConfirmed", handleCardConfirmed);
    socket.on("cardError", handleCardError);
    socket.on("cardUnavailable", handleCardUnavailable);
    socket.on("initialCardStates", handleInitialCardStates);
    socket.on("connect_error", handleSocketError);
    socket.on("connect", handleSocketConnect);

    return () => {
      socket.off("otherCardSelected", handleBoardTaken);
      socket.off("cardReleased", handleBoardReleased);
      socket.off("cardConfirmed", handleCardConfirmed);
      socket.off("cardError", handleCardError);
      socket.off("cardUnavailable", handleCardUnavailable);
      socket.off("initialCardStates", handleInitialCardStates);
      socket.off("connect_error", handleSocketError);
      socket.off("connect", handleSocketConnect);
    };
  }, [telegramId, gameId]);

  // Countdown timer
  useEffect(() => {
    if (initialCountdown && initialCountdown > 0) {
      setCurrentCountdown(initialCountdown);
      
      countdownRef.current = setInterval(() => {
        setCurrentCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            // Release selected board if any
            if (selectedBoard) {
              socket.emit("unselectCardOnLeave", { 
                gameId, 
                telegramId,
                cardId: selectedBoard.cartelaId
              });
            }
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
  }, [initialCountdown, navigate, gameId, telegramId, GameSessionId, existingBoards, selectedBoard]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        goBack();
      }
      if (e.key === 'Enter' && selectedBoard && !isCountdownTooLow) {
        confirmSelection();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [selectedBoard]);

  const isCountdownTooLow = currentCountdown && currentCountdown <= 5;

  // ✅ FIXED: Enhanced board selection with proper socket communication
  const handleBoardSelect = async (number) => {
    if (isCountdownTooLow || isLoading || emitLockRef.current) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const selectedCard = bingoCards.find(card => card.id === number);
      if (!selectedCard) {
        throw new Error("Card not found for ID: " + number);
      }

      // Check if board is taken by others in current game
      const isTakenByOthers = takenBoards.has(number);
      if (isTakenByOthers) {
        throw new Error("This board is already taken by another player");
      }

      // Check if this is the same board we already have selected
      if (selectedBoard?.cartelaId === number) {
        // Deselect current board
        socket.emit("unselectCardOnLeave", { 
          gameId, 
          telegramId,
          cardId: number
        });
        setSelectedBoard(null);
        setIsLoading(false);
        return;
      }

      // Release previously selected board if any
      if (selectedBoard) {
        socket.emit("unselectCardOnLeave", { 
          gameId, 
          telegramId,
          cardId: selectedBoard.cartelaId
        });
      }

      // Set emit lock and generate request ID
      emitLockRef.current = true;
      lastRequestIdRef.current += 1;
      const requestId = lastRequestIdRef.current;

      // Optimistic UI update
      setSelectedBoard({
        cartelaId: number,
        cartela: selectedCard.card
      });

      // Notify server about this selection with proper card data
      socket.emit("cardSelected", { 
        telegramId,
        gameId,
        cardId: number,
        card: selectedCard.card,
        requestId
      });

      // Set a timeout to release the lock in case no response
      setTimeout(() => {
        if (emitLockRef.current && lastRequestIdRef.current === requestId) {
          console.warn("Card selection timeout, releasing lock");
          emitLockRef.current = false;
          setIsLoading(false);
        }
      }, 5000);
      
    } catch (err) {
      setError(err.message || "Failed to select board. Please try again.");
      console.error("Board selection error:", err);
      setIsLoading(false);
      emitLockRef.current = false;
    }
  };

  // ✅ FIXED: Enhanced confirmation with proper socket events
  const confirmSelection = async () => {
    if (!selectedBoard || isCountdownTooLow || isLoading) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // The board is already confirmed via the cardSelected flow
      // We just need to navigate back with the new board

      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }

      // Check if the board is still available
      if (takenBoards.has(selectedBoard.cartelaId)) {
        throw new Error("This board was taken by another player while you were selecting");
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
      
    } catch (err) {
      setError(err.message || "Failed to confirm selection. Please try again.");
      console.error("Confirmation error:", err);
      setIsLoading(false);
      
      // Reset selection on error
      if (selectedBoard) {
        socket.emit("unselectCardOnLeave", { 
          gameId, 
          telegramId,
          cardId: selectedBoard.cartelaId
        });
        setSelectedBoard(null);
      }
    }
  };

  const goBack = () => {
    // Release the selected board if going back
    if (selectedBoard) {
      socket.emit("unselectCardOnLeave", { 
        gameId, 
        telegramId,
        cardId: selectedBoard.cartelaId
      });
    }

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    navigate("/game", {
      state: {
        gameId,
        telegramId,
        GameSessionId,
        selectedBoards: existingBoards,
        countdown: currentCountdown
      },
      replace: true
    });
  };

  // ✅ FIXED: Only consider a board "taken" if it's taken by OTHER players
  const isBoardTaken = (number) => {
    return takenBoards.has(number);
  };

  // ✅ FIXED: Enhanced board status checking
  const isBoardUnavailable = (number) => {
    // Check if taken by others
    const takenByOthers = takenBoards.has(number);
    
    // Check if it's in our existing boards (from bingoCards.json)
    const isInExistingBoards = existingBoards.some(board => board.cartelaId === number);
    
    return takenByOthers || isInExistingBoards;
  };

  const getBoardColor = (number) => {
    if (selectedBoard?.cartelaId === number) {
      return "bg-green-500 text-white shadow-lg scale-105 border-2 border-green-300";
    }
    if (isBoardUnavailable(number)) {
      // Different color for boards we already own vs taken by others
      const isOurBoard = existingBoards.some(board => board.cartelaId === number);
      if (isOurBoard) {
        return "bg-blue-500 text-white cursor-not-allowed opacity-70 border-2 border-blue-300";
      }
      return "bg-red-500 text-white cursor-not-allowed opacity-70 border-2 border-red-300";
    }
    if (isCountdownTooLow) return "bg-gray-400 text-white cursor-not-allowed opacity-50";
    if (isLoading) return "bg-gray-300 text-gray-500 cursor-not-allowed";
    return "bg-white text-black hover:bg-gray-100 hover:shadow-md transition-all duration-200 border-2 border-gray-300";
  };

  const getBoardTooltip = (number) => {
    if (selectedBoard?.cartelaId === number) return "Selected - Click to deselect";
    
    const isOurBoard = existingBoards.some(board => board.cartelaId === number);
    if (isOurBoard) return "Already in your boards";
    
    if (takenBoards.has(number)) 
      return "Taken by another player";
    
    if (isCountdownTooLow) 
      return "Countdown too low";
    
    return "Available - Click to select";
  };

  // ✅ FIXED: Enhanced disable logic
  const isBoardDisabled = (number) => {
    // Don't disable our currently selected board (allow deselection)
    if (selectedBoard?.cartelaId === number) {
      return false;
    }
    
    return isBoardUnavailable(number) || isCountdownTooLow || isLoading || emitLockRef.current;
  };

  // ✅ NEW: Get available boards count
  const getAvailableBoardsCount = () => {
    return numbers.filter(num => !isBoardUnavailable(num)).length;
  };

  return (
    <div className="bg-gradient-to-br from-violet-300 via-purple-400 to-indigo-500 min-h-screen p-4 flex flex-col items-center relative">
      {/* Header */}
      <div className="text-center text-white mb-4">
        <h1 className="text-2xl font-bold mb-2">Add Another Board</h1>
        <p className="text-sm">Select one additional board to play with</p>
        
        {/* Show current boards info */}
        {existingBoards.length > 0 && (
          <div className="px-3 py-1 bg-blue-500/50 rounded-full mt-2 text-xs">
            Current Boards: {existingBoards.map(b => b.cartelaId).join(', ')}
          </div>
        )}
        
        {/* Available boards count */}
        <div className="px-3 py-1 bg-green-500/50 rounded-full mt-1 text-xs">
          Available Boards: {getAvailableBoardsCount()}/100
        </div>
        
        {/* Countdown Display */}
        {currentCountdown > 0 && (
          <div className={`px-3 py-1 rounded-full mt-2 text-xs font-bold transition-all duration-300 ${
            currentCountdown <= 5 
              ? 'bg-red-500 animate-pulse text-white' 
              : 'bg-blue-500 text-white'
          }`}>
            ⏰ Countdown: {currentCountdown}s
          </div>
        )}
      </div>

      {/* Selected Board Preview */}
      {selectedBoard && (
        <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg mb-4 w-full max-w-md border-2 border-green-300/50">
          <h3 className="text-white font-semibold mb-3 text-center">
            ✅ Selected Board #{selectedBoard.cartelaId}
          </h3>
          <div className="grid grid-cols-5 gap-1">
            {selectedBoard.cartela.flat().map((num, idx) => (
              <div 
                key={idx}
                className="bg-white/30 text-white text-xs w-6 h-6 flex items-center justify-center rounded border border-white/20 font-bold"
              >
                {num === 0 ? "⭐" : num}
              </div>
            ))}
          </div>
          <p className="text-white/80 text-xs text-center mt-2">
            Click the board number again to deselect, or press ENTER to confirm
          </p>
        </div>
      )}

      {/* Board Grid */}
      <div className="grid grid-cols-10 gap-1.5 py-2 px-3 max-w-lg w-full text-xs mb-20 bg-white/10 backdrop-blur-sm rounded-xl border-2 border-white/20">
        {numbers.map((num) => (
          <button
            key={num}
            onClick={() => handleBoardSelect(num)}
            disabled={isBoardDisabled(num)}
            className={`w-8 h-8 flex items-center justify-center rounded-md font-bold cursor-pointer transition-all duration-200 text-xs relative group ${getBoardColor(num)}`}
            title={getBoardTooltip(num)}
          >
            {num}
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs py-1 px-2 rounded z-50 whitespace-nowrap pointer-events-none">
              {getBoardTooltip(num)}
            </div>
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-4 left-4 right-4 flex gap-3 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border-2 border-white/20">
        <button
          onClick={goBack}
          disabled={isLoading}
          className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {selectedBoard ? "Cancel" : "Back to Game"}
        </button>
        <button
          onClick={confirmSelection}
          disabled={!selectedBoard || isCountdownTooLow || isLoading}
          className={`flex-1 py-3 rounded-lg font-semibold transition disabled:cursor-not-allowed ${
            !selectedBoard || isCountdownTooLow || isLoading
              ? "bg-gray-500 text-gray-300" 
              : "bg-green-500 hover:bg-green-600 text-white shadow-lg"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Loading...
            </div>
          ) : selectedBoard ? (
            `Add Board #${selectedBoard.cartelaId}`
          ) : (
            "Select a Board"
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg z-50 shadow-lg border-2 border-red-300 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <p className="text-sm">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-white hover:text-gray-200 text-lg font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl border-2 border-white/20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p className="text-gray-700 text-sm text-center">Processing selection...</p>
          </div>
        </div>
      )}

      {/* Auto-return Overlay */}
      {isCountdownTooLow && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 text-center shadow-2xl border-2 border-white/20">
            <div className="text-4xl mb-3 animate-bounce">⏰</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Time's Up!</h3>
            <p className="text-gray-600 mb-4">
              Returning to game...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(currentCountdown / 5) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="fixed top-20 right-4 bg-white/20 backdrop-blur-sm p-3 rounded-lg border-2 border-white/30 max-w-xs hidden md:block">
        <h4 className="text-white font-semibold mb-2 text-sm">Quick Tips:</h4>
        <ul className="text-white text-xs space-y-1">
          <li>• <span className="bg-green-500 px-1 rounded">Green</span> = Selected</li>
          <li>• <span className="bg-red-500 px-1 rounded">Red</span> = Taken by others</li>
          <li>• <span className="bg-blue-500 px-1 rounded">Blue</span> = Your boards</li>
          <li>• Click selected board to deselect</li>
          <li>• Press ESC to cancel</li>
          <li>• Press ENTER to confirm</li>
        </ul>
      </div>

      {/* Status Bar */}
      <div className="fixed top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs">
        {emitLockRef.current ? "🔄 Processing..." : "✅ Ready"}
      </div>
    </div>
  );
};

export default AddBoard;