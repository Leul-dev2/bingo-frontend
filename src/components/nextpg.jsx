import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../../socket";

// ==================== CONSTANTS & CONFIGURATION ====================
const CONFIG = {
  GAME: {
    MIN_PLAYERS_TO_START: 2,
    AUTO_LEAVE_DELAY: 3,
    COUNTDOWN_WARNING_THRESHOLD: 10,
    RECENT_CALLS_DISPLAY_COUNT: 3,
    BOARD_TYPES: {
      PRIMARY: "PRIMARY BOARD",
      SECONDARY: "SECONDARY BOARD"
    }
  },
  AUDIO: {
    BASE_PATH: "/audio/audio",
    FILE_EXTENSION: ".mp3"
  },
  STORAGE: {
    AUDIO_STATE: "isAudioOn",
    SELECTED_NUMBERS: "selectedNumbers",
    SELECTED_NUMBERS_PER_BOARD: "selectedNumbersPerBoard"
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
const BingoCell = React.memo(({ num, isFreeSpace, isSelected, onClick, disabled = false }) => {
  const baseClasses = "md:w-10 md:h-10 w-8 h-8 flex items-center justify-center font-extrabold text-md sm:text-lg border rounded-lg shadow-md transition";
  
  const getCellClasses = () => {
    if (isFreeSpace) {
      return `${baseClasses} bg-gradient-to-b from-green-400 to-green-600 text-white cursor-default`;
    }
    
    if (isSelected) {
      return `${baseClasses} bg-gradient-to-b from-green-400 to-green-600 text-white cursor-pointer hover:scale-105`;
    }
    
    return `${baseClasses} bg-white text-black cursor-pointer hover:scale-105 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
  };

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={getCellClasses()}
      aria-label={isFreeSpace ? "Free space" : `Number ${num}${isSelected ? ' selected' : ''}`}
    >
      {isFreeSpace ? "⭐" : num}
    </div>
  );
});

const NumberGrid = React.memo(({ calledSet, bingoColors }) => {
  const letters = ["B", "I", "N", "G", "O"];
  
  return (
    <div className="grid grid-cols-5 bg-[#2a0047] p-1 gap-2 rounded-lg text-xs w-full">
      {/* Header Letters */}
      {letters.map((letter, i) => (
        <div key={i} className={`text-white text-center text-xs font-bold rounded-full h-4 w-6 ${bingoColors[letter]}`}>
          {letter}
        </div>
      ))}
      
      {/* Number Grid */}
      {[...Array(15)].map((_, rowIndex) =>
        letters.map((letter, colIndex) => {
          const number = rowIndex + 1 + colIndex * 15;
          const randomNumberLabel = `${letter}-${number}`;
          const isCalled = calledSet.has(randomNumberLabel);

          return (
            <div
              key={randomNumberLabel}
              className={`text-center rounded ${
                isCalled
                  ? "bg-gradient-to-b from-yellow-400 to-orange-500 text-black"
                  : "bg-gray-800 text-gray-400 font-bold"
              }`}
            >
              {number}
            </div>
          );
        })
      )}
    </div>
  );
});

const RecentCalls = React.memo(({ recentNumbers }) => {
  const colors = ["bg-red-800", "bg-green-800", "bg-blue-800"];
  
  return (
    <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-2 rounded-lg w-full">
      <p className="text-center font-bold text-xs text-yellow-400 mb-1">Recent Calls</p>
      <div className="flex justify-center gap-2">
        {recentNumbers.map((num, index) => (
          <div
            key={index}
            className={`w-6 h-6 flex items-center justify-center text-xs font-extrabold rounded-full text-white ${colors[index] || 'bg-gray-600'}`}
          >
            {num}
          </div>
        ))}
        {/* Fill empty slots if less than 3 numbers */}
        {recentNumbers.length < 3 && 
          Array.from({ length: 3 - recentNumbers.length }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="w-6 h-6 flex items-center justify-center text-xs font-extrabold rounded-full bg-gray-600 text-gray-400"
            >
              -
            </div>
          ))
        }
      </div>
    </div>
  );
});

// ==================== MAIN COMPONENT ====================
const BingoGame = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartela, cartelaId, gameId, telegramId, GameSessionId, selectedBoards } = location.state || {};

  // ==================== STATE MANAGEMENT ====================
  const [randomNumber, setRandomNumber] = useState([]);
  const [calledSet, setCalledSet] = useState(new Set());
  const [lastCalledLabel, setLastCalledLabel] = useState(null);
  const [selectedNumbers, setSelectedNumbers] = useState(new Set());
  const [countdown, setCountdown] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [winnerFound, setWinnerFound] = useState(false);
  const [hasEmittedGameCount, setHasEmittedGameCount] = useState(false);
  const [isGameEnd, setIsGameEnd] = useState(false);
  const [callNumberLength, setCallNumberLength] = useState(0);
  const [isAudioOn, setIsAudioOn] = useLocalStorage(CONFIG.STORAGE.AUDIO_STATE, false);
  const [audioPrimed, setAudioPrimed] = useState(false);
  const [showAddBoardWarning, setShowAddBoardWarning] = useState(false);
  const [autoLeaveCountdown, setAutoLeaveCountdown] = useState(CONFIG.GAME.AUTO_LEAVE_DELAY);

  // Multi-board states
  const [activeBoards, setActiveBoards] = useState([]);
  const [selectedNumbersPerBoard, setSelectedNumbersPerBoard] = useState({});

  const [gameDetails, setGameDetails] = useState({
    winAmount: '-',
    playersCount: '-',
    stakeAmount: '-',
  });

  // ==================== REFS ====================
  const hasJoinedRef = useRef(false);
  const saveTimeout = useRef(null);
  const autoLeaveTimeout = useRef(null);
  const audioCache = useRef(new Map());

  // ==================== MEMOIZED VALUES ====================
  const bingoColors = useMemo(() => ({
    B: "bg-yellow-500",
    I: "bg-green-500",
    N: "bg-blue-500",
    G: "bg-red-500",
    O: "bg-purple-500",
  }), []);

  const recentNumbers = useMemo(() => 
    randomNumber.slice(-CONFIG.GAME.RECENT_CALLS_DISPLAY_COUNT), 
    [randomNumber]
  );

  const isMultiBoard = useMemo(() => activeBoards.length > 1, [activeBoards.length]);

  // ==================== EFFECTS ====================

  // Initialize boards
  useEffect(() => {
    const initializeBoards = () => {
      if (selectedBoards && selectedBoards.length > 0) {
        // Multi-board format
        setActiveBoards(selectedBoards);
        const initialSelections = {};
        selectedBoards.forEach(board => {
          initialSelections[board.cartelaId] = new Set();
        });
        setSelectedNumbersPerBoard(initialSelections);
        
        logger.info('Multi-board game initialized', {
          boardCount: selectedBoards.length,
          boardIds: selectedBoards.map(b => b.cartelaId)
        });
      } else if (cartelaId && cartela) {
        // Single board format (backward compatibility)
        setActiveBoards([{ cartelaId, cartela }]);
        setSelectedNumbersPerBoard({ [cartelaId]: new Set() });
        setSelectedNumbers(new Set());
        
        logger.info('Single board game initialized', { cartelaId });
      } else {
        logger.warn('No valid board data provided', { cartelaId, selectedBoards });
        navigate("/");
      }
    };

    initializeBoards();
  }, [selectedBoards, cartelaId, cartela, navigate]);

  // Auto leave countdown when game ends
  useEffect(() => {
    if (isGameEnd) {
      setAutoLeaveCountdown(CONFIG.GAME.AUTO_LEAVE_DELAY);
      const timer = setInterval(() => {
        setAutoLeaveCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handlePlayerLeave();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isGameEnd]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !gameId || !telegramId) return;

    // Initial connection
    if (!socket.connected) {
      socket.connect();
    }
    
    if (!hasJoinedRef.current) {
      socket.emit("joinGame", { gameId, telegramId, GameSessionId });
      hasJoinedRef.current = true;
      logger.info('Joined game session', { gameId, telegramId, GameSessionId });
    }

    // Event handlers
    const handleSocketConnect = () => {
      logger.info('Socket connected/reconnected');
      if (gameId && telegramId) {
        socket.emit("joinGame", { gameId, telegramId, GameSessionId });
      }
    };

    const handlePlayerCountUpdate = ({ playerCount }) => {
      setPlayerCount(playerCount);
      logger.info('Player count updated', { playerCount });
    };

    const handleCountdownTick = ({ countdown }) => {
      setCountdown(countdown);
    };

    const handleGameStart = () => {
      setGameStarted(true);
      logger.info('Game started');
    };

    const handleGameEnd = () => {
      logger.info('Game ended');
      setIsGameEnd(true);
    };

    const handleGameReset = () => {
      logger.info('Game reset received');
      setHasEmittedGameCount(false);
      setRandomNumber([]);
      setCalledSet(new Set());
      setSelectedNumbers(new Set());
      setSelectedNumbersPerBoard({});
      setCountdown(0);
      setGameStarted(false);
      setLastCalledLabel(null);
      setIsGameEnd(false);
      setAutoLeaveCountdown(CONFIG.GAME.AUTO_LEAVE_DELAY);
    };

    const handleDrawnNumbersHistory = ({ gameId: receivedGameId, history }) => {
      if (receivedGameId === gameId) {
        const numbers = history.map(item => item.number);
        const labels = new Set(history.map(item => item.label));
        setRandomNumber(numbers);
        setCalledSet(labels);
        if (history.length > 0) {
          setLastCalledLabel(history[history.length - 1].label);
        }
        logger.info('Loaded drawn numbers history', { count: history.length });
      }
    };

    const handleNumberDrawn = ({ number, label, callNumberLength }) => {
      logger.info('Number drawn', { number, label });
      setRandomNumber(prev => [...prev, number]);
      setCalledSet(prev => new Set([...prev, label]));
      setCallNumberLength(callNumberLength);
      setLastCalledLabel(label);

      if (isAudioOn) {
        playAudioForNumber(number);
      }
    };

    const handleBingoClaimFailed = ({ message, reason, telegramId, gameId, cardId, card, lastTwoNumbers, selectedNumbers }) => {
      logger.warn('Bingo claim failed', { reason, cardId });
      navigate("/winnerFailed", { 
        state: { 
          message, 
          reason, 
          telegramId,
          gameId,
          cardId,
          card, 
          lastTwoNumbers, 
          selectedNumbers 
        } 
      });
    };

    const handleGameDetails = ({ winAmount, playersCount, stakeAmount }) => {
      setGameDetails({ winAmount, playersCount, stakeAmount });
      logger.info('Game details updated', { winAmount, playersCount, stakeAmount });
    };

    const handleWinnerConfirmed = ({ winnerName, prizeAmount, board, winnerPattern, boardNumber, playerCount, telegramId, gameId, GameSessionId }) => {
      logger.info('Winner confirmed', { winnerName, prizeAmount });
      navigate("/winnerPage", { 
        state: { 
          winnerName, 
          prizeAmount, 
          board, 
          winnerPattern, 
          boardNumber, 
          playerCount, 
          telegramId, 
          gameId, 
          GameSessionId 
        } 
      });
    };

    const handleWinnerError = () => {
      logger.error('Winner error received');
      handlePlayerLeave();
    };

    // Register event listeners
    const eventHandlers = {
      "connect": handleSocketConnect,
      "playerCountUpdate": handlePlayerCountUpdate,
      "countdownTick": handleCountdownTick,
      "gameStart": handleGameStart,
      "gameEnd": handleGameEnd,
      "gameReset": handleGameReset,
      "drawnNumbersHistory": handleDrawnNumbersHistory,
      "numberDrawn": handleNumberDrawn,
      "gameDetails": handleGameDetails,
      "winnerConfirmed": handleWinnerConfirmed,
      "winnerError": handleWinnerError,
      "bingoClaimFailed": handleBingoClaimFailed
    };

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // Cleanup
    return () => {
      Object.keys(eventHandlers).forEach(event => {
        socket.off(event);
      });
      
      if (autoLeaveTimeout.current) clearTimeout(autoLeaveTimeout.current);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [gameId, telegramId, GameSessionId, navigate, isAudioOn]);

  // Request to start game if enough players
  useEffect(() => {
    if (playerCount >= CONFIG.GAME.MIN_PLAYERS_TO_START && !hasEmittedGameCount && !gameStarted) {
      logger.info('Emitting gameCount to start game', { playerCount });
      socket.emit("gameCount", { gameId, GameSessionId });
      setHasEmittedGameCount(true);
    }
  }, [playerCount, gameStarted, hasEmittedGameCount, gameId, GameSessionId]);

  // Local countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // ==================== EVENT HANDLERS ====================
  const playAudioForNumber = useCallback((number) => {
    if (!isAudioOn) return;

    try {
      const audioPath = `${CONFIG.AUDIO.BASE_PATH}${number}${CONFIG.AUDIO.FILE_EXTENSION}`;
      
      // Use cached audio if available
      if (!audioCache.current.has(number)) {
        audioCache.current.set(number, new Audio(audioPath));
      }
      
      const audio = audioCache.current.get(number);
      audio.currentTime = 0;
      
      audio.play().catch((error) => {
        logger.error('Audio playback failed', error, { number, audioPath });
      });
    } catch (error) {
      logger.error('Audio initialization failed', error, { number });
    }
  }, [isAudioOn]);

  const handlePlayerLeave = useCallback(() => {
    logger.info('Player leaving game', { gameId, GameSessionId });
    socket.emit("playerLeave", { 
      gameId: String(gameId), 
      GameSessionId, 
      telegramId 
    }, () => {
      navigate("/");
    });
  }, [gameId, GameSessionId, telegramId, navigate, socket]);

  const handleCartelaClick = useCallback((num, boardId) => {
    setSelectedNumbersPerBoard(prev => {
      const newSelections = { ...prev };
      
      // Update the clicked board
      const currentBoardSelections = new Set(prev[boardId] || []);
      if (currentBoardSelections.has(num)) {
        currentBoardSelections.delete(num);
      } else {
        currentBoardSelections.add(num);
      }
      newSelections[boardId] = currentBoardSelections;
      
      // Sync this number to all other boards where it exists
      activeBoards.forEach(board => {
        if (board.cartelaId !== boardId) {
          const numberExistsInBoard = board.cartela.flat().includes(num);
          if (numberExistsInBoard) {
            const otherBoardSelections = new Set(prev[board.cartelaId] || []);
            if (currentBoardSelections.has(num)) {
              otherBoardSelections.add(num);
            } else {
              otherBoardSelections.delete(num);
            }
            newSelections[board.cartelaId] = otherBoardSelections;
          }
        }
      });
      
      return newSelections;
    });

    // For single board compatibility
    if (activeBoards.length === 1) {
      const newSelection = new Set(selectedNumbers);
      if (newSelection.has(num)) {
        newSelection.delete(num);
      } else {
        newSelection.add(num);
      }
      setSelectedNumbers(newSelection);
    }

    // Debounced save to localStorage
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      try {
        localStorage.setItem(CONFIG.STORAGE.SELECTED_NUMBERS, JSON.stringify([...selectedNumbers]));
        localStorage.setItem(CONFIG.STORAGE.SELECTED_NUMBERS_PER_BOARD, JSON.stringify(
          Object.fromEntries(
            Object.entries(selectedNumbersPerBoard).map(([id, set]) => [id, [...set]])
          )
        ));
      } catch (error) {
        logger.error('Failed to save selections to localStorage', error);
      }
    }, 300);
  }, [activeBoards, selectedNumbers, selectedNumbersPerBoard]);

  const checkForWin = useCallback((boardId) => {
    let selectedSet;
    let boardCartelaId;
    
    if (activeBoards.length === 1) {
      selectedSet = selectedNumbers;
      boardCartelaId = cartelaId;
    } else {
      selectedSet = selectedNumbersPerBoard[boardId] || new Set();
      const board = activeBoards.find(b => b.cartelaId === boardId);
      boardCartelaId = boardId;
    }

    const selectedArray = Array.from(selectedSet);

    logger.info('Checking for win', {
      boardId: boardCartelaId,
      selectedCount: selectedArray.length
    });

    socket.emit("checkWinner", {
      telegramId,
      gameId,
      GameSessionId,
      cartelaId: boardCartelaId,
      selectedNumbers: selectedArray,
    });
  }, [activeBoards, selectedNumbers, selectedNumbersPerBoard, telegramId, gameId, GameSessionId, cartelaId, socket]);

  const navigateToAddBoard = useCallback(() => {
    if (countdown < CONFIG.GAME.COUNTDOWN_WARNING_THRESHOLD) {
      setShowAddBoardWarning(true);
      return;
    }

    navigate("/add-board", {
      state: {
        telegramId,
        gameId,
        GameSessionId,
        existingBoards: activeBoards,
        countdown
      }
    });
  }, [countdown, navigate, telegramId, gameId, GameSessionId, activeBoards]);

  const handleAudioToggle = useCallback(() => {
    if (!isAudioOn) {
      // Prime audio for first time
      const audio = new Audio(`${CONFIG.AUDIO.BASE_PATH}1${CONFIG.AUDIO.FILE_EXTENSION}`);
      audio.volume = 0;
      
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        setIsAudioOn(true);
        setAudioPrimed(true);
        logger.info('Audio primed successfully');
      }).catch((error) => {
        logger.warn('Audio priming failed', error);
        alert("Audio could not be enabled. Please try clicking again.");
      });
    } else {
      setIsAudioOn(false);
      logger.info('Audio disabled');
    }
  }, [isAudioOn]);

  const handleRefresh = useCallback(() => {
    if (gameId && telegramId) {
      socket.emit("joinGame", { gameId, telegramId, GameSessionId });
      logger.info('Manual refresh triggered');
    } else {
      logger.warn('Cannot refresh: missing game data');
      window.location.reload();
    }
  }, [gameId, telegramId, GameSessionId, socket]);

  // ==================== RENDER FUNCTIONS ====================
  const renderGameInfoCards = () => (
    <div className="grid grid-cols-5 sm:grid-cols-5 gap-1 w-full text-white text-center mt-2 mb-2">
      {[
        `Players: ${gameDetails.playersCount}`,
        `Prize: ${gameDetails.winAmount}`,
        `Call: ${callNumberLength}`,
        `Stake: ${gameDetails.stakeAmount}`,
      ].map((info, i) => (
        <button key={i} className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-1 text-xs rounded w-full">
          {info}
        </button>
      ))}
      <button
        onClick={handleAudioToggle}
        className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-1 text-xs rounded w-full transition-transform hover:scale-105"
      >
        {`${isAudioOn ? "🔊" : "🔇"}`}
      </button>
    </div>
  );

  const renderLeftColumn = () => {
    if (!isMultiBoard) {
      return (
        <div className="grid grid-cols-5 bg-[#2a0047] p-1 gap-2 rounded-lg text-xs w-[90%]">
          <NumberGrid calledSet={calledSet} bingoColors={bingoColors} />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 h-full">
        {/* Countdown and Current Number */}
        <div className="flex flex-row gap-2 w-full justify-center">
          <div className="bg-gray-300 p-2 rounded-lg text-center w-1/2 flex items-center justify-center">
            <p className="text-xl font-bold">{countdown > 0 ? countdown : "Wait"}</p>
          </div>
          <div className="bg-gradient-to-b from-purple-800 to-purple-900 rounded-lg text-white flex items-center justify-center w-1/2 p-2">
            <div className="w-12 h-12 flex items-center justify-center text-xl font-extrabold rounded-full shadow-[0_0_15px_#37ebf3] bg-[#37ebf3] text-purple-900">
              {lastCalledLabel || "-"}
            </div>
          </div>
        </div>

        <RecentCalls recentNumbers={recentNumbers} />
        <NumberGrid calledSet={calledSet} bingoColors={bingoColors} />
      </div>
    );
  };

  const renderSingleBoard = () => {
    if (activeBoards.length === 0) return null;
    
    const board = activeBoards[0];
    const boardSelections = selectedNumbersPerBoard[board.cartelaId] || new Set();

    return (
      <div className="flex flex-col items-center gap-1">
        {/* Controls for single board */}
        <div className="bg-gray-300 p-2 rounded-lg text-center text-xs w-[90%] flex-row flex items-center h-[7%] justify-around">
          <p>Countdown</p>
          <p className="text-lg font-bold">{countdown > 0 ? countdown : "Wait"}</p>
        </div>

        <div className="bg-gradient-to-b from-purple-800 to-purple-900 rounded-lg text-white flex flex-row justify-around items-center w-full max-w-md mx-auto">
          <p className="font-bold text-xs">Current Number</p>
          <div className="flex justify-center items-center gap-4">
            <div className="w-14 h-14 flex items-center justify-center text-xl font-extrabold rounded-full shadow-[0_0_20px_#37ebf3] bg-[#37ebf3] text-purple-900">
              {lastCalledLabel || "-"}
            </div>
          </div>
        </div>

        <RecentCalls recentNumbers={recentNumbers.slice(0, 3)} />

        {/* Single Board Layout */}
        <div className="w-full">
          <div className="space-y-4">
            <div className="bg-gradient-to-b from-purple-800 to-purple-900 p-4 rounded-lg w-full max-w-md mx-auto">
              {/* BINGO Header */}
              <div className="grid grid-cols-5 gap-0.5 mb-2">
                {["B", "I", "N", "G", "O"].map((letter, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 flex items-center justify-center font-bold text-white text-sm rounded-full ${bingoColors[letter]}`}
                  >
                    {letter}
                  </div>
                ))}
              </div>

              {/* Bingo Numbers Grid */}
              <div className="grid grid-cols-5 gap-1">
                {board.cartela.map((row, rowIndex) =>
                  row.map((num, colIndex) => {
                    const isFreeSpace = rowIndex === 2 && colIndex === 2;
                    const isSelectedNum = boardSelections.has(num);

                    return (
                      <BingoCell
                        key={`${board.cartelaId}-${rowIndex}-${colIndex}`}
                        num={num}
                        isFreeSpace={isFreeSpace}
                        isSelected={isSelectedNum}
                        onClick={() => handleCartelaClick(num, board.cartelaId)}
                        disabled={isGameEnd}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMultiBoards = () => {
    if (activeBoards.length === 0) return null;

    return (
      <div className="flex flex-col gap-3 h-full">
        {/* Shared BINGO Header */}
        <div className="grid grid-cols-5 gap-0.2 mb-2 w-full max-w-md">
          {["B", "I", "N", "G", "O"].map((letter, i) => (
            <div
              key={i}
              className={`w-8 h-8 flex items-center justify-center font-bold text-white text-sm rounded-full ${bingoColors[letter]}`}
            >
              {letter}
            </div>
          ))}
        </div>

        {/* Vertical Stack of Boards */}
        <div className="flex-1 flex flex-col gap-3">
          {activeBoards.map((board, boardIndex) => {
            const boardSelections = selectedNumbersPerBoard[board.cartelaId] || new Set();
            const boardType = boardIndex === 0 ? CONFIG.GAME.BOARD_TYPES.PRIMARY : CONFIG.GAME.BOARD_TYPES.SECONDARY;
            
            return (
              <div key={board.cartelaId} className="bg-gradient-to-b from-purple-800 to-purple-900 p-3 rounded-lg w-full flex-1">
                {/* Board Header */}
                <div className="text-center text-yellow-400 text-sm mb-2 font-bold">
                  {boardType}
                </div>

                {/* Bingo Numbers Grid */}
                <div className="grid grid-cols-5 gap-1">
                  {board.cartela.map((row, rowIndex) =>
                    row.map((num, colIndex) => {
                      const isFreeSpace = rowIndex === 2 && colIndex === 2;
                      const isSelectedNum = boardSelections.has(num);

                      return (
                        <BingoCell
                          key={`${board.cartelaId}-${rowIndex}-${colIndex}`}
                          num={num}
                          isFreeSpace={isFreeSpace}
                          isSelected={isSelectedNum}
                          onClick={() => handleCartelaClick(num, board.cartelaId)}
                          disabled={isGameEnd}
                        />
                      );
                    })
                  )}
                </div>

                {/* Bingo Button */}
                <button 
                  onClick={() => checkForWin(board.cartelaId)}
                  disabled={isGameEnd}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 disabled:from-gray-500 disabled:to-gray-600 px-2 py-1 text-white rounded-4xl text-xs font-bold shadow-lg transition-all duration-200 mt-2"
                >
                  BINGO!
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderActionButtons = () => (
    <div className="w-full flex flex-col items-center gap-3 mt-3">
      {/* Single Board BINGO Button */}
      {!isMultiBoard && activeBoards.length > 0 && (
        <button 
          onClick={() => checkForWin(activeBoards[0].cartelaId)}
          disabled={isGameEnd}
          className="w-full max-w-md bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 disabled:from-gray-500 disabled:to-gray-600 px-4 py-3 text-white rounded-4xl text-lg font-bold shadow-lg transition-all duration-200"
        >
          BINGO!
        </button>
      )}

      {/* Action Buttons */}
      <div className="w-full flex gap-3 justify-center">
        <button
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 px-14 h-10 text-white rounded-full text-sm font-semibold shadow-md transition-all duration-200"
          onClick={handleRefresh}
        >
          Refresh
        </button>
        <button
          onClick={handlePlayerLeave}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 px-14 h-10 text-white rounded-full text-sm font-semibold shadow-md transition-all duration-200"
        >
          Leave
        </button>
        {!isMultiBoard && (
          <button
            onClick={navigateToAddBoard}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 px-14 h-10 text-white rounded-full text-sm font-semibold shadow-md transition-all duration-200"
          >
            Add Board
          </button>
        )}
      </div>
    </div>
  );

  const renderAddBoardWarning = () => (
    showAddBoardWarning && (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white p-6 rounded-lg max-w-sm mx-4">
          <h3 className="text-lg font-bold mb-2">Cannot Add Board</h3>
          <p className="text-gray-600 mb-4">
            Countdown is too low ({countdown}s). You cannot add boards when countdown is below {CONFIG.GAME.COUNTDOWN_WARNING_THRESHOLD} seconds.
          </p>
          <button
            onClick={() => setShowAddBoardWarning(false)}
            className="w-full bg-orange-500 text-white py-2 rounded-lg font-semibold transition-colors hover:bg-orange-600"
          >
            OK
          </button>
        </div>
      </div>
    )
  );

  const renderGameEndModal = () => (
    isGameEnd && (
      <div className="fixed inset-0 flex items-center justify-center bg-opacity-80 backdrop-blur-sm z-50 transition-opacity duration-300">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
            🎉 Game Over
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            The game has ended. Automatically leaving in {autoLeaveCountdown} seconds...
          </p>
          <button
            className="w-1/2 bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-white rounded-lg text-lg font-semibold shadow-md transition-all hover:scale-105"
            onClick={handlePlayerLeave}
          >
            Leave Now
          </button>
        </div>
      </div>
    )
  );

  // ==================== MAIN RENDER ====================
  if (!telegramId || !gameId || activeBoards.length === 0) {
    return (
      <div className="bg-gradient-to-b from-[#1a002b] via-[#2d003f] to-black min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-[#1a002b] via-[#2d003f] to-black min-h-screen flex flex-col items-center p-1 pb-3 w-full max-w-screen overflow-hidden">
      {renderGameInfoCards()}
      
      <div className={`flex w-full mt-1 ${isMultiBoard ? 'gap-3' : ''}`}>
        {/* Column 1: Controls and Number Grid */}
        <div className="w-[45%] flex flex-col">
          {renderLeftColumn()}
        </div>

        {/* Column 2: Boards */}
        <div className="w-[55%] flex flex-col">
          {isMultiBoard ? renderMultiBoards() : renderSingleBoard()}
        </div>
      </div>

      {renderActionButtons()}
      {renderAddBoardWarning()}
      {renderGameEndModal()}
    </div>
  );
};

export default BingoGame;