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
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
  
  const countdownRef = useRef(null);

  // ✅ NEW: Socket state recovery on mount
  useEffect(() => {
    if (telegramId && gameId && GameSessionId) {
      console.log('🔄 AddBoard: Recovering socket state');
      socket.emit("recoverSocketState", {
        telegramId,
        gameId,
        GameSessionId,
        fromPage: 'addBoard'
      });
    }
  }, [telegramId, gameId, GameSessionId]);

  // ✅ NEW: Socket connection status monitoring
  useEffect(() => {
    const handleConnect = () => {
      console.log('✅ AddBoard: Socket connected');
      setSocketConnected(true);
      setError(null);
    };

    const handleDisconnect = () => {
      console.log('🔴 AddBoard: Socket disconnected');
      setSocketConnected(false);
    };

    const handleReconnect = () => {
      console.log('🔄 AddBoard: Socket reconnected, recovering state');
      setSocketConnected(true);
      // Recover socket state after reconnection
      if (telegramId && gameId && GameSessionId) {
        socket.emit("recoverSocketState", {
          telegramId,
          gameId,
          GameSessionId,
          fromPage: 'addBoard'
        });
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect', handleReconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect', handleReconnect);
    };
  }, [telegramId, gameId, GameSessionId]);

  // ✅ UPDATED: Socket event listeners with better error handling
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

    const handleSocketError = (error) => {
      console.error("Socket error in AddBoard:", error);
      setError("Connection error. Please try again.");
    };

    const handleSocketConnect = () => {
      console.log("✅ Socket reconnected in AddBoard");
      setSocketConnected(true);
      setError(null);
    };

    // ✅ NEW: Socket state preservation confirmation
    const handleSocketStatePreserved = () => {
      console.log('✅ Socket state preserved for navigation');
    };

    // ✅ NEW: Socket state recovery confirmation
    const handleSocketStateRecovered = () => {
      console.log('✅ Socket state recovered successfully');
    };

    const handleSocketStateRecoveryFailed = ({ message }) => {
      console.warn('⚠️ Socket state recovery failed:', message);
      setError("Connection issue. Please try refreshing.");
    };

    socket.on("otherCardSelected", handleBoardTaken);
    socket.on("cardReleased", handleBoardReleased);
    socket.on("connect_error", handleSocketError);
    socket.on("connect", handleSocketConnect);
    socket.on("socketStatePreserved", handleSocketStatePreserved);
    socket.on("socketStateRecovered", handleSocketStateRecovered);
    socket.on("socketStateRecoveryFailed", handleSocketStateRecoveryFailed);

    return () => {
      socket.off("otherCardSelected", handleBoardTaken);
      socket.off("cardReleased", handleBoardReleased);
      socket.off("connect_error", handleSocketError);
      socket.off("connect", handleSocketConnect);
      socket.off("socketStatePreserved", handleSocketStatePreserved);
      socket.off("socketStateRecovered", handleSocketStateRecovered);
      socket.off("socketStateRecoveryFailed", handleSocketStateRecoveryFailed);
    };
  }, [telegramId]);

  // ✅ UPDATED: Countdown timer with socket state preservation
  useEffect(() => {
    if (initialCountdown && initialCountdown > 0) {
      setCurrentCountdown(initialCountdown);
      
      countdownRef.current = setInterval(() => {
        setCurrentCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            // Release selected board if any
            if (selectedBoard) {
              socket.emit("cardReleased", { 
                cardId: selectedBoard.cartelaId, 
                gameId 
              });
            }
            
            // ✅ FIX: Preserve socket state before navigation
            socket.emit("preserveSocketState", {
              telegramId,
              gameId,
              GameSessionId,
              currentPhase: 'addBoard'
            });

            navigate("/game", {
              state: {
                gameId,
                telegramId,
                GameSessionId,
                selectedBoards: existingBoards,
                countdown: 0,
                fromAddBoard: true // Flag for state recovery in BingoGame
              }
              // ❌ REMOVED: replace: true to maintain navigation history
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

  // ✅ UPDATED: Keyboard navigation with socket state check
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        goBack();
      }
      if (e.key === 'Enter' && selectedBoard && !isCountdownTooLow && socketConnected) {
        confirmSelection();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [selectedBoard, socketConnected]);

  const isCountdownTooLow = currentCountdown && currentCountdown <= 5;

  // ✅ UPDATED: Board selection with socket state preservation
  const handleBoardSelect = async (number) => {
    if (isCountdownTooLow || isLoading || !socketConnected) {
      if (!socketConnected) {
        setError("Connection lost. Please wait for reconnection.");
      }
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const selectedCard = bingoCards.find(card => card.id === number);
      if (!selectedCard) {
        throw new Error("Card not found for ID: " + number);
      }

      // ✅ ONLY check if board is taken by others in current game
      const isTakenByOthers = takenBoards.has(number);
      if (isTakenByOthers) {
        throw new Error("This board is already taken by another player");
      }

      // Release previously selected board if any
      if (selectedBoard) {
        socket.emit("cardReleased", { 
          cardId: selectedBoard.cartelaId, 
          gameId 
        });
      }

      // ✅ ADDED: Preserve socket state before selection
      socket.emit("preserveSocketState", {
        telegramId,
        gameId,
        GameSessionId,
        currentPhase: 'addBoard'
      });

      // Notify other players about this selection
      socket.emit("cardSelected", { 
        cardId: number, 
        telegramId,
        gameId,
        GameSessionId
      });

      setSelectedBoard({
        cartelaId: number,
        cartela: selectedCard.card
      });
      
    } catch (err) {
      setError(err.message || "Failed to select board. Please try again.");
      console.error("Board selection error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ UPDATED: Confirm selection with enhanced socket state management
  const confirmSelection = async () => {
    if (!selectedBoard || isCountdownTooLow || !socketConnected) {
      if (!socketConnected) {
        setError("Connection lost. Please wait for reconnection.");
      }
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // ✅ ADDED: Preserve socket state before confirmation
      socket.emit("preserveSocketState", {
        telegramId,
        gameId,
        GameSessionId,
        currentPhase: 'addBoard'
      });

      // Notify server that we're keeping this board
      socket.emit("cardConfirmed", { 
        cardId: selectedBoard.cartelaId, 
        telegramId,
        gameId,
        GameSessionId
      });

      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }

      // ✅ FIX: Use state to pass navigation info instead of replace
      navigate("/game", {
        state: {
          gameId,
          telegramId,
          GameSessionId,
          selectedBoards: [...existingBoards, selectedBoard],
          countdown: currentCountdown,
          fromAddBoard: true, // Flag to trigger state recovery in BingoGame
          preserveSocket: true // Important flag
        }
        // ❌ REMOVED: replace: true to maintain navigation history
      });
      
    } catch (err) {
      setError("Failed to confirm selection. Please try again.");
      console.error("Confirmation error:", err);
      setIsLoading(false);
    }
  };

  // ✅ UPDATED: Go back with socket state preservation
  const goBack = () => {
    // Release the selected board if going back
    if (selectedBoard) {
      socket.emit("cardReleased", { 
        cardId: selectedBoard.cartelaId, 
        gameId,
        GameSessionId
      });
    }

    // ✅ ADDED: Preserve socket state before navigation
    socket.emit("preserveSocketState", {
      telegramId,
      gameId,
      GameSessionId,
      currentPhase: 'addBoard'
    });

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    // ✅ FIX: Use state to pass navigation info
    navigate(-1, {
      state: {
        preserveSocket: true,
        fromAddBoard: true
      }
    });
  };

  // ✅ FIXED: Only consider a board "taken" if it's taken by OTHER players
  const isBoardTaken = (number) => {
    const takenByOthers = takenBoards.has(number);
    return takenByOthers;
  };

  // ✅ FIXED: Only consider a board "unavailable" if it's taken by others
  const isBoardUnavailable = (number) => {
    const takenByOthers = takenBoards.has(number);
    return takenByOthers;
  };

  // ✅ UPDATED: Get board color with connection status
  const getBoardColor = (number) => {
    if (!socketConnected) return "bg-gray-400 text-white cursor-not-allowed opacity-50";
    if (selectedBoard?.cartelaId === number) return "bg-green-500 text-white shadow-lg scale-105";
    if (isBoardUnavailable(number)) return "bg-red-500 text-white cursor-not-allowed opacity-70";
    if (isCountdownTooLow) return "bg-gray-400 text-white cursor-not-allowed opacity-50";
    if (isLoading) return "bg-gray-300 text-gray-500 cursor-not-allowed";
    return "bg-white text-black hover:bg-gray-100 hover:shadow-md transition-all duration-200";
  };

  // ✅ UPDATED: Get board tooltip with connection status
  const getBoardTooltip = (number) => {
    if (!socketConnected) return "Connection lost - reconnecting...";
    if (selectedBoard?.cartelaId === number) return "Selected";
    
    if (takenBoards.has(number)) 
      return "Taken by another player";
    
    if (isCountdownTooLow) 
      return "Countdown too low";
    
    return "Available";
  };

  // ✅ UPDATED: Only disable if taken by others or connection lost
  const isBoardDisabled = (number) => {
    return !socketConnected || isBoardUnavailable(number) || isCountdownTooLow || isLoading;
  };

  return (
    <div className="bg-gradient-to-br from-violet-300 via-purple-400 to-indigo-500 min-h-screen p-4 flex flex-col items-center relative">
      {/* Header */}
      <div className="text-center text-white mb-4">
        <h1 className="text-2xl font-bold mb-2">Add Another Board</h1>
        <p className="text-sm">Select one additional board to play with</p>
        
        {/* ✅ NEW: Connection status indicator */}
        <div className={`px-3 py-1 rounded-full mt-2 text-xs font-bold ${
          socketConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'
        }`}>
          {socketConnected ? '🟢 Connected' : '🔴 Connecting...'}
        </div>
        
        {/* Show current boards info */}
        {existingBoards.length > 0 && (
          <div className="px-3 py-1 bg-blue-500/50 rounded-full mt-2 text-xs">
            Current Primary Boards: {existingBoards.map(b => b.cartelaId).join(', ')}
          </div>
        )}
        
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
        <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg mb-4 w-full max-w-md border border-white/30">
          <h3 className="text-white font-semibold mb-3 text-center">
            Selected Board #{selectedBoard.cartelaId}
          </h3>
          <div className="grid grid-cols-5 gap-1">
            {selectedBoard.cartela.flat().map((num, idx) => (
              <div 
                key={idx}
                className="bg-white/30 text-white text-xs w-6 h-6 flex items-center justify-center rounded border border-white/20"
              >
                {num === "FREE" ? "⭐" : num}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Board Grid */}
      <div className="grid grid-cols-10 gap-1.5 py-2 px-3 max-w-lg w-full text-xs mb-20 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
        {numbers.map((num) => (
          <button
            key={num}
            onClick={() => handleBoardSelect(num)}
            disabled={isBoardDisabled(num)}
            className={`w-8 h-8 flex items-center justify-center rounded-md border-2 font-bold cursor-pointer transition-all duration-200 text-xs relative group ${getBoardColor(num)}`}
            title={getBoardTooltip(num)}
          >
            {num}
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs py-1 px-2 rounded z-50 whitespace-nowrap">
              {getBoardTooltip(num)}
            </div>
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-4 left-4 right-4 flex gap-3 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-white/20">
        <button
          onClick={goBack}
          disabled={isLoading}
          className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={confirmSelection}
          disabled={!selectedBoard || isCountdownTooLow || isLoading || !socketConnected}
          className={`flex-1 py-3 rounded-lg font-semibold transition disabled:cursor-not-allowed ${
            !selectedBoard || isCountdownTooLow || isLoading || !socketConnected
              ? "bg-gray-500 text-gray-300" 
              : "bg-green-500 hover:bg-green-600 text-white shadow-lg"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Loading...
            </div>
          ) : !socketConnected ? (
            "Connecting..."
          ) : selectedBoard ? (
            `Add Board #${selectedBoard.cartelaId}`
          ) : (
            "Add Board"
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg z-50 shadow-lg border border-red-300 animate-fade-in">
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
          <div className="bg-white p-6 rounded-xl shadow-2xl border border-white/20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p className="text-gray-700 text-sm text-center">Processing selection...</p>
          </div>
        </div>
      )}

      {/* Auto-return Overlay */}
      {isCountdownTooLow && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 text-center shadow-2xl border border-white/20">
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
      <div className="fixed top-20 right-4 bg-white/20 backdrop-blur-sm p-3 rounded-lg border border-white/30 max-w-xs hidden md:block">
        <h4 className="text-white font-semibold mb-2 text-sm">Quick Tips:</h4>
        <ul className="text-white text-xs space-y-1">
          <li>• Click any available number to select a board</li>
          <li>• Green = Selected</li>
          <li>• Red = Taken by another player</li>
          <li>• Gray = Connection issue</li>
          <li>• Press ESC to cancel</li>
          <li>• Press ENTER to confirm</li>
        </ul>
      </div>
    </div>
  );
};

export default AddBoard;