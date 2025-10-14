import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import bingoCards from "../assets/bingoCards2.json";
import socket from "../../socket";

// ==================== CONSTANTS & CONFIGURATION ====================
const CONFIG = {
  COUNTDOWN: {
    WARNING_THRESHOLD: 5,
    AUTO_RETURN_THRESHOLD: 5,
    UPDATE_INTERVAL: 1000
  },
  BOARD: {
    TOTAL_CARDS: 100,
    GRID_COLUMNS: 10,
    PREVIEW_GRID_SIZE: 5
  },
  KEYBOARD: {
    ESCAPE: 'Escape',
    ENTER: 'Enter'
  },
  SOCKET: {
    EVENTS: {
      CARD_SELECTED: "otherCardSelected",
      CARD_RELEASED: "cardReleased",
      CONNECT_ERROR: "connect_error",
      CONNECT: "connect"
    }
  }
};

// ==================== UTILITY FUNCTIONS ====================
const logger = {
  info: (message, data = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...data
    }));
  },
  error: (message, error = null, data = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      ...data
    }));
  },
  warn: (message, data = {}) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...data
    }));
  }
};

const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.error('Error reading from localStorage', error, { key });
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.error('Error writing to localStorage', error, { key });
    }
  }, [key]);

  return [storedValue, setValue];
};

// ==================== MEMOIZED COMPONENTS ====================
const BoardPreview = React.memo(({ selectedBoard }) => {
  if (!selectedBoard) return null;

  return (
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
  );
});

const CountdownDisplay = React.memo(({ currentCountdown }) => {
  if (!currentCountdown || currentCountdown <= 0) return null;

  const isWarning = currentCountdown <= CONFIG.COUNTDOWN.WARNING_THRESHOLD;

  return (
    <div className={`px-3 py-1 rounded-full mt-2 text-xs font-bold transition-all duration-300 ${
      isWarning 
        ? 'bg-red-500 animate-pulse text-white' 
        : 'bg-blue-500 text-white'
    }`}>
      ⏰ Countdown: {currentCountdown}s
    </div>
  );
});

const BoardGrid = React.memo(({ 
  numbers, 
  selectedBoard, 
  takenBoards, 
  currentCountdown, 
  isLoading, 
  onBoardSelect 
}) => {
  const isCountdownTooLow = currentCountdown && currentCountdown <= CONFIG.COUNTDOWN.AUTO_RETURN_THRESHOLD;

  const getBoardColor = useCallback((number) => {
    if (selectedBoard?.cartelaId === number) 
      return "bg-green-500 text-white shadow-lg scale-105";
    if (takenBoards.has(number)) 
      return "bg-red-500 text-white cursor-not-allowed opacity-70";
    if (isCountdownTooLow) 
      return "bg-gray-400 text-white cursor-not-allowed opacity-50";
    if (isLoading) 
      return "bg-gray-300 text-gray-500 cursor-not-allowed";
    return "bg-white text-black hover:bg-gray-100 hover:shadow-md transition-all duration-200";
  }, [selectedBoard, takenBoards, isCountdownTooLow, isLoading]);

  const getBoardTooltip = useCallback((number) => {
    if (selectedBoard?.cartelaId === number) return "Selected";
    if (takenBoards.has(number)) return "Taken by another player";
    if (isCountdownTooLow) return "Countdown too low";
    return "Available";
  }, [selectedBoard, takenBoards, isCountdownTooLow]);

  const isBoardDisabled = useCallback((number) => {
    return takenBoards.has(number) || isCountdownTooLow || isLoading;
  }, [takenBoards, isCountdownTooLow, isLoading]);

  return (
    <div className="grid grid-cols-10 gap-1.5 py-2 px-3 max-w-lg w-full text-xs mb-20 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
      {numbers.map((num) => (
        <button
          key={num}
          onClick={() => onBoardSelect(num)}
          disabled={isBoardDisabled(num)}
          className={`w-8 h-8 flex items-center justify-center rounded-md border-2 font-bold cursor-pointer transition-all duration-200 text-xs relative group ${getBoardColor(num)}`}
          title={getBoardTooltip(num)}
          aria-label={`Board ${num} - ${getBoardTooltip(num)}`}
        >
          {num}
          {/* Enhanced Tooltip */}
          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs py-1 px-2 rounded z-50 whitespace-nowrap pointer-events-none">
            {getBoardTooltip(num)}
          </div>
        </button>
      ))}
    </div>
  );
});

const ActionButtons = React.memo(({ 
  selectedBoard, 
  currentCountdown, 
  isLoading, 
  onConfirm, 
  onCancel 
}) => {
  const isCountdownTooLow = currentCountdown && currentCountdown <= CONFIG.COUNTDOWN.AUTO_RETURN_THRESHOLD;
  const isConfirmDisabled = !selectedBoard || isCountdownTooLow || isLoading;

  return (
    <div className="fixed bottom-4 left-4 right-4 flex gap-3 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-white/20">
      <button
        onClick={onCancel}
        disabled={isLoading}
        className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        aria-label="Cancel and go back"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={isConfirmDisabled}
        className={`flex-1 py-3 rounded-lg font-semibold transition disabled:cursor-not-allowed ${
          isConfirmDisabled
            ? "bg-gray-500 text-gray-300" 
            : "bg-green-500 hover:bg-green-600 text-white shadow-lg"
        }`}
        aria-label={selectedBoard ? `Add Board ${selectedBoard.cartelaId}` : "Add Board"}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2" aria-label="Loading">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
            Loading...
          </div>
        ) : selectedBoard ? (
          `Add Board #${selectedBoard.cartelaId}`
        ) : (
          "Add Board"
        )}
      </button>
    </div>
  );
});

// ==================== MAIN COMPONENT ====================
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

  // ==================== STATE MANAGEMENT ====================
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [takenBoards, setTakenBoards] = useState(new Set());
  const [currentCountdown, setCurrentCountdown] = useState(initialCountdown || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // ==================== REFS ====================
  const countdownRef = useRef(null);
  const mountedRef = useRef(true);

  // ==================== MEMOIZED VALUES ====================
  const numbers = useMemo(() => 
    Array.from({ length: CONFIG.BOARD.TOTAL_CARDS }, (_, i) => i + 1), 
    []
  );

  const isCountdownTooLow = useMemo(() => 
    currentCountdown && currentCountdown <= CONFIG.COUNTDOWN.AUTO_RETURN_THRESHOLD,
    [currentCountdown]
  );

  // ==================== EFFECTS ====================

  // Component mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !telegramId) return;

    const handleBoardTaken = ({ cardId, telegramId: takenBy }) => {
      if (takenBy !== telegramId) {
        setTakenBoards(prev => new Set([...prev, cardId]));
        logger.info('Board taken by another player', { cardId, takenBy });
      }
    };

    const handleBoardReleased = ({ cardId }) => {
      setTakenBoards(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardId);
        return newSet;
      });
      logger.info('Board released', { cardId });
    };

    const handleSocketError = (error) => {
      logger.error('Socket connection error', error);
      setError("Connection error. Please try again.");
    };

    const handleSocketConnect = () => {
      logger.info('Socket reconnected');
      setError(null);
    };

    // Register event listeners
    socket.on(CONFIG.SOCKET.EVENTS.CARD_SELECTED, handleBoardTaken);
    socket.on(CONFIG.SOCKET.EVENTS.CARD_RELEASED, handleBoardReleased);
    socket.on(CONFIG.SOCKET.EVENTS.CONNECT_ERROR, handleSocketError);
    socket.on(CONFIG.SOCKET.EVENTS.CONNECT, handleSocketConnect);

    // Cleanup
    return () => {
      socket.off(CONFIG.SOCKET.EVENTS.CARD_SELECTED, handleBoardTaken);
      socket.off(CONFIG.SOCKET.EVENTS.CARD_RELEASED, handleBoardReleased);
      socket.off(CONFIG.SOCKET.EVENTS.CONNECT_ERROR, handleSocketError);
      socket.off(CONFIG.SOCKET.EVENTS.CONNECT, handleSocketConnect);
    };
  }, [telegramId]);

  // Countdown timer
  useEffect(() => {
    if (initialCountdown && initialCountdown > 0 && mountedRef.current) {
      setCurrentCountdown(initialCountdown);
      
      countdownRef.current = setInterval(() => {
        setCurrentCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            handleAutoReturn();
            return 0;
          }
          return prev - 1;
        });
      }, CONFIG.COUNTDOWN.UPDATE_INTERVAL);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [initialCountdown]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === CONFIG.KEYBOARD.ESCAPE) {
        goBack();
      }
      if (e.key === CONFIG.KEYBOARD.ENTER && selectedBoard && !isCountdownTooLow) {
        confirmSelection();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [selectedBoard, isCountdownTooLow]);

  // ==================== EVENT HANDLERS ====================
  const handleAutoReturn = useCallback(() => {
    if (!mountedRef.current) return;

    logger.info('Auto-returning to game due to countdown');
    
    // Release selected board if any
    if (selectedBoard) {
      socket.emit("cardReleased", { 
        cardId: selectedBoard.cartelaId, 
        gameId,
        GameSessionId
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
  }, [selectedBoard, gameId, GameSessionId, telegramId, existingBoards, navigate]);

  const handleBoardSelect = useCallback(async (number) => {
    if (isCountdownTooLow || isLoading || !mountedRef.current) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const selectedCard = bingoCards.find(card => card.id === number);
      if (!selectedCard) {
        throw new Error(`Card not found for ID: ${number}`);
      }

      // Check if board is taken by others in current game
      const isTakenByOthers = takenBoards.has(number);
      if (isTakenByOthers) {
        throw new Error("This board is already taken by another player");
      }

      // Release previously selected board if any
      if (selectedBoard) {
        socket.emit("cardReleased", { 
          cardId: selectedBoard.cartelaId, 
          gameId,
          GameSessionId
        });
        logger.info('Released previous board selection', { 
          previousBoardId: selectedBoard.cartelaId 
        });
      }

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
      
      logger.info('Board selected successfully', { boardId: number });
      
    } catch (err) {
      const errorMessage = err.message || "Failed to select board. Please try again.";
      setError(errorMessage);
      logger.error('Board selection error', err, { boardId: number });
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isCountdownTooLow, isLoading, takenBoards, selectedBoard, gameId, GameSessionId, telegramId]);

  const confirmSelection = useCallback(async () => {
    if (!selectedBoard || isCountdownTooLow || !mountedRef.current) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

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

      logger.info('Board selection confirmed', { 
        boardId: selectedBoard.cartelaId,
        totalBoards: existingBoards.length + 1
      });

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
      const errorMessage = "Failed to confirm selection. Please try again.";
      setError(errorMessage);
      logger.error('Confirmation error', err, { boardId: selectedBoard.cartelaId });
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [selectedBoard, isCountdownTooLow, telegramId, gameId, GameSessionId, existingBoards, currentCountdown, navigate]);

  const goBack = useCallback(() => {
    logger.info('Navigating back from AddBoard');
    
    // Release the selected board if going back
    if (selectedBoard) {
      socket.emit("cardReleased", { 
        cardId: selectedBoard.cartelaId, 
        gameId,
        GameSessionId
      });
    }

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    navigate(-1);
  }, [selectedBoard, gameId, GameSessionId, navigate]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ==================== RENDER FUNCTIONS ====================
  const renderHeader = () => (
    <div className="text-center text-white mb-4">
      <h1 className="text-2xl font-bold mb-2">Add Another Board</h1>
      <p className="text-sm">Select one additional board to play with</p>
      
      {/* Show current boards info */}
      {existingBoards.length > 0 && (
        <div className="px-3 py-1 bg-blue-500/50 rounded-full mt-2 text-xs">
          Current Primary Boards: {existingBoards.map(b => b.cartelaId).join(', ')}
        </div>
      )}
      
      <CountdownDisplay currentCountdown={currentCountdown} />
    </div>
  );

  const renderError = () => (
    error && (
      <div className="fixed top-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg z-50 shadow-lg border border-red-300 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden="true">⚠️</span>
            <p className="text-sm">{error}</p>
          </div>
          <button 
            onClick={clearError}
            className="text-white hover:text-gray-200 text-lg font-bold transition-colors"
            aria-label="Dismiss error message"
          >
            ×
          </button>
        </div>
      </div>
    )
  );

  const renderLoadingOverlay = () => (
    isLoading && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-xl shadow-2xl border border-white/20">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"
            aria-hidden="true"
          ></div>
          <p className="text-gray-700 text-sm text-center">Processing selection...</p>
        </div>
      </div>
    )
  );

  const renderAutoReturnOverlay = () => (
    isCountdownTooLow && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-sm mx-4 text-center shadow-2xl border border-white/20">
          <div className="text-4xl mb-3 animate-bounce" aria-hidden="true">⏰</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Time's Up!</h3>
          <p className="text-gray-600 mb-4">
            Returning to game...
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(currentCountdown / CONFIG.COUNTDOWN.AUTO_RETURN_THRESHOLD) * 100}%` }}
              aria-hidden="true"
            ></div>
          </div>
        </div>
      </div>
    )
  );

  const renderInstructions = () => (
    <div className="fixed top-20 right-4 bg-white/20 backdrop-blur-sm p-3 rounded-lg border border-white/30 max-w-xs hidden md:block">
      <h4 className="text-white font-semibold mb-2 text-sm">Quick Tips:</h4>
      <ul className="text-white text-xs space-y-1">
        <li>• Click any available number to select a board</li>
        <li>• Green = Selected</li>
        <li>• Red = Taken by another player</li>
        <li>• Press ESC to cancel</li>
        <li>• Press ENTER to confirm</li>
      </ul>
    </div>
  );

  // ==================== MAIN RENDER ====================
  if (!telegramId || !gameId) {
    return (
      <div className="bg-gradient-to-br from-violet-300 via-purple-400 to-indigo-500 min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <p>Missing required game data. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-violet-300 via-purple-400 to-indigo-500 min-h-screen p-4 flex flex-col items-center relative">
      {renderHeader()}
      <BoardPreview selectedBoard={selectedBoard} />
      
      <BoardGrid
        numbers={numbers}
        selectedBoard={selectedBoard}
        takenBoards={takenBoards}
        currentCountdown={currentCountdown}
        isLoading={isLoading}
        onBoardSelect={handleBoardSelect}
      />

      <ActionButtons
        selectedBoard={selectedBoard}
        currentCountdown={currentCountdown}
        isLoading={isLoading}
        onConfirm={confirmSelection}
        onCancel={goBack}
      />

      {renderError()}
      {renderLoadingOverlay()}
      {renderAutoReturnOverlay()}
      {renderInstructions()}
    </div>
  );
};

export default AddBoard;