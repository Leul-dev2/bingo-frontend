import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../../socket";

// Constants
const BINGO_CONFIG = {
  LETTERS: ["B", "I", "N", "G", "O"],
  COLORS: {
    B: "bg-yellow-500",
    I: "bg-green-500", 
    N: "bg-blue-500",
    G: "bg-red-500",
    O: "bg-purple-500",
  },
  MAX_BOARDS: 2,
  COUNTDOWN_THRESHOLD: 10,
  FREE_SPACE_POSITION: { row: 2, col: 2 }
};

// Memoized Bingo Cell Component
const BingoCell = React.memo(({ num, isFreeSpace, isSelected, onClick }) => (
  <div
    onClick={onClick}
    className={`md:w-10 md:h-10 w-8 h-8 flex items-center justify-center font-extrabold text-md sm:text-lg border rounded-lg shadow-md cursor-pointer transition ${
      isFreeSpace
        ? "bg-gradient-to-b from-green-400 to-green-600 text-white"
        : isSelected
        ? "bg-gradient-to-b from-green-400 to-green-600 text-white"
        : "bg-white text-black"
    }`}
  >
    {isFreeSpace ? "⭐" : num}
  </div>
));

// Bingo Board Component
const BingoBoard = React.memo(({ 
  board, 
  boardId, 
  boardIndex, 
  selectedNumbers, 
  onCellClick, 
  onBingo 
}) => {
  const isFreeSpace = useCallback((rowIndex, colIndex) => 
    rowIndex === BINGO_CONFIG.FREE_SPACE_POSITION.row && 
    colIndex === BINGO_CONFIG.FREE_SPACE_POSITION.col,
    []
  );

  return (
    <div className="bg-gradient-to-b from-purple-800 to-purple-900 p-4 rounded-lg w-full max-w-md mx-auto">
      {/* Board Header */}
      <div className="text-center text-yellow-400 text-sm mb-2 font-bold">
        {boardIndex === 0 ? "PRIMARY BOARD" : "SECONDARY BOARD"}
      </div>
      
      {/* BINGO Header */}
      <div className="grid grid-cols-5 gap-1 mb-2">
        {BINGO_CONFIG.LETTERS.map((letter, i) => (
          <div
            key={letter}
            className={`w-8 h-8 flex items-center justify-center font-bold text-white text-sm rounded-full ${BINGO_CONFIG.COLORS[letter]}`}
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Bingo Numbers Grid */}
      <div className="grid grid-cols-5 gap-1">
        {board.cartela.map((row, rowIndex) =>
          row.map((num, colIndex) => {
            const isFree = isFreeSpace(rowIndex, colIndex);
            const isSelectedNum = selectedNumbers.has(num);

            return (
              <BingoCell
                key={`${boardId}-${rowIndex}-${colIndex}`}
                num={num}
                isFreeSpace={isFree}
                isSelected={isSelectedNum}
                onClick={() => onCellClick(num, boardId)}
              />
            );
          })
        )}
      </div>

      {/* Bingo Button */}
      <button 
        onClick={() => onBingo(boardId)}
        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 px-4 py-2 text-white rounded-4xl text-sm font-bold shadow-lg transition-all duration-200 mt-3"
      >
        BINGO! (Board #{boardId})
      </button>
    </div>
  );
});

// Called Numbers Grid Component
const CalledNumbersGrid = React.memo(({ calledNumbers }) => {
  const renderNumberGrid = useMemo(() => {
    return [...Array(15)].map((_, rowIndex) =>
      BINGO_CONFIG.LETTERS.map((letter, colIndex) => {
        const number = rowIndex + 1 + colIndex * 15;
        const randomNumberLabel = `${letter}-${number}`;
        const isCalled = calledNumbers.has(randomNumberLabel);

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
    );
  }, [calledNumbers]);

  return (
    <div className="w-[45%] flex justify-center">
      <div className="grid grid-cols-5 bg-[#2a0047] p-1 gap-2 rounded-lg text-xs w-[90%]">
        {BINGO_CONFIG.LETTERS.map((letter) => (
          <div key={letter} className={`text-white text-center text-xs font-bold rounded-full h-4 w-6 ${BINGO_CONFIG.COLORS[letter]}`}>
            {letter}
          </div>
        ))}
        {renderNumberGrid}
      </div>
    </div>
  );
});

// Game Stats Component
const GameStats = React.memo(({ 
  playersCount, 
  winAmount, 
  callNumberLength, 
  stakeAmount, 
  isAudioOn, 
  onToggleAudio 
}) => {
  const stats = [
    `Players: ${playersCount}`,
    `Prize: ${winAmount}`,
    `Call: ${callNumberLength}`,
    `Stake: ${stakeAmount}`,
  ];

  return (
    <div className="grid grid-cols-5 sm:grid-cols-5 gap-1 w-full text-white text-center mt-2 mb-2">
      {stats.map((info, i) => (
        <button key={i} className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-1 text-xs rounded w-full">
          {info}
        </button>
      ))}
      <button
        onClick={onToggleAudio}
        className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-1 text-xs rounded w-full"
      >
        {isAudioOn ? "🔊" : "🔇"}
      </button>
    </div>
  );
});

// Main Bingo Game Component
const BingoGame = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartela, cartelaId, gameId, telegramId, GameSessionId, selectedBoards } = location.state || {};

  // State Management
  const [gameState, setGameState] = useState({
    randomNumbers: [],
    calledNumbers: new Set(),
    currentCall: null,
    countdown: 0,
    lastCalledLabel: null,
    playerCount: 0,
    gameStarted: false,
    winnerFound: false,
    isGameEnd: false,
    callNumberLength: 0,
    isAudioOn: false,
    audioPrimed: false,
    failedBingo: null,
    showAddBoardWarning: false,
    hasEmittedGameCount: false,
    gracePlayers: [],
  });

  const [activeBoards, setActiveBoards] = useState([]);
  const [selectedNumbersPerBoard, setSelectedNumbersPerBoard] = useState({});
  const [selectedNumbers, setSelectedNumbers] = useState(new Set());
  const [gameDetails, setGameDetails] = useState({
    winAmount: '-',
    playersCount: '-', 
    stakeAmount: '-',
  });

  const hasJoinedRef = useRef(false);
  const saveTimeout = useRef(null);

  // Initialize Boards
  useEffect(() => {
    if (selectedBoards?.length > 0) {
      setActiveBoards(selectedBoards);
      const initialSelections = {};
      selectedBoards.forEach(board => {
        initialSelections[board.cartelaId] = new Set();
      });
      setSelectedNumbersPerBoard(initialSelections);
    } else if (cartelaId && cartela) {
      setActiveBoards([{ cartelaId, cartela }]);
      setSelectedNumbersPerBoard({ [cartelaId]: new Set() });
      setSelectedNumbers(new Set());
    }
  }, [selectedBoards, cartelaId, cartela]);

  // Enhanced Socket Event Handlers
  const socketEventHandlers = useRef({
    connect: () => {
      console.log("✅ Socket.IO connected!");
      if (gameId && telegramId) {
        socket.emit("joinGame", { gameId, telegramId, GameSessionId });
      }
    },
    playerCountUpdate: ({ playerCount }) => 
      setGameState(prev => ({ ...prev, playerCount })),
    countdownTick: ({ countdown }) => 
      setGameState(prev => ({ ...prev, countdown })),
    gameStart: () => setGameState(prev => ({ ...prev, gameStarted: true })),
    gameEnd: () => setGameState(prev => ({ ...prev, isGameEnd: true })),
    gameReset: () => {
      setGameState(prev => ({
        ...prev,
        hasEmittedGameCount: false,
        randomNumbers: [],
        calledNumbers: new Set(),
        countdown: 0,
        gameStarted: false,
        lastCalledLabel: null,
      }));
      setSelectedNumbers(new Set());
      setSelectedNumbersPerBoard({});
    },
    drawnNumbersHistory: ({ gameId: receivedGameId, history }) => {
      if (receivedGameId === gameId) {
        const numbers = history.map(item => item.number);
        const labels = new Set(history.map(item => item.label));
        setGameState(prev => ({
          ...prev,
          randomNumbers: numbers,
          calledNumbers: labels,
          lastCalledLabel: history.length > 0 ? history[history.length - 1].label : null
        }));
      }
    },
    numberDrawn: ({ number, label, callNumberLength }) => {
      setGameState(prev => ({
        ...prev,
        randomNumbers: [...prev.randomNumbers, number],
        calledNumbers: new Set(prev.calledNumbers).add(label),
        callNumberLength,
        lastCalledLabel: label
      }));

      if (gameState.isAudioOn) {
        playAudioForNumber(number);
      }
    },
    bingoClaimFailed: ({ message, reason, telegramId, gameId, cardId, card, lastTwoNumbers, selectedNumbers }) => {
      navigate("/winnerFailed", { 
        state: { message, reason, telegramId, gameId, cardId, card, lastTwoNumbers, selectedNumbers } 
      });
    },
    gameDetails: ({ winAmount, playersCount, stakeAmount }) => {
      setGameDetails({ winAmount, playersCount, stakeAmount });
    },
    winnerConfirmed: ({ winnerName, prizeAmount, board, winnerPattern, boardNumber, playerCount, telegramId, gameId, GameSessionId }) => {
      navigate("/winnerPage", { 
        state: { winnerName, prizeAmount, board, winnerPattern, boardNumber, playerCount, telegramId, gameId, GameSessionId } 
      });
    },
    winnerError: () => {
      socket.emit("playerLeave", { gameId: String(gameId), GameSessionId, telegramId }, () => {
        navigate("/");
      });
    }
  });

  // Socket Connection Management
  useEffect(() => {
    if (!socket.connected) socket.connect();
    
    if (!hasJoinedRef.current && gameId && telegramId) {
      socket.emit("joinGame", { gameId, telegramId, GameSessionId });
      hasJoinedRef.current = true;
    }

    // Register all event listeners
    Object.entries(socketEventHandlers.current).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      // Cleanup all event listeners
      Object.entries(socketEventHandlers.current).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [gameId, telegramId, GameSessionId, navigate]);

  // Audio Management
  const playAudioForNumber = useCallback((number) => {
    if (!gameState.isAudioOn) return;

    const audio = new Audio(`/audio/audio${number}.mp3`);
    audio.currentTime = 0;
    audio.play().catch((error) => {
      console.error(`🔊 Failed to play audio ${number}:`, error);
    });
  }, [gameState.isAudioOn]);

  // Game Count Management
  useEffect(() => {
    if (gameState.playerCount >= 2 && !gameState.hasEmittedGameCount && !gameState.gameStarted) {
      socket.emit("gameCount", { gameId, GameSessionId });
      setGameState(prev => ({ ...prev, hasEmittedGameCount: true }));
    }
  }, [gameState.playerCount, gameState.gameStarted, gameState.hasEmittedGameCount, gameId, GameSessionId]);

  // Countdown Timer
  useEffect(() => {
    if (gameState.countdown > 0) {
      const timer = setTimeout(() => {
        setGameState(prev => ({ ...prev, countdown: prev.countdown - 1 }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState.countdown]);

  // Enhanced Board Selection Handler with Dual Board Sync
  const handleCartelaClick = useCallback((num, boardId) => {
    setSelectedNumbersPerBoard(prev => {
      const newSelections = { ...prev };
      
      // Handle single board selection
      if (activeBoards.length === 1) {
        const newSelection = new Set(prev[boardId] || []);
        newSelection.has(num) ? newSelection.delete(num) : newSelection.add(num);
        newSelections[boardId] = newSelection;
        setSelectedNumbers(newSelection);
      } else {
        // Handle dual board selection with sync
        const currentBoardSelections = new Set(prev[boardId] || []);
        currentBoardSelections.has(num) ? currentBoardSelections.delete(num) : currentBoardSelections.add(num);
        newSelections[boardId] = currentBoardSelections;

        // If number exists in both boards, sync the selection
        const otherBoardId = activeBoards.find(b => b.cartelaId !== boardId)?.cartelaId;
        if (otherBoardId) {
          const otherBoard = activeBoards.find(b => b.cartelaId === otherBoardId);
          const numberExistsInOtherBoard = otherBoard.cartela.some(row => row.includes(num));
          
          if (numberExistsInOtherBoard) {
            const otherBoardSelections = new Set(prev[otherBoardId] || []);
            if (currentBoardSelections.has(num)) {
              otherBoardSelections.add(num);
            } else {
              otherBoardSelections.delete(num);
            }
            newSelections[otherBoardId] = otherBoardSelections;
          }
        }
      }

      return newSelections;
    });

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      localStorage.setItem("selectedNumbers", JSON.stringify([...selectedNumbers]));
      localStorage.setItem("selectedNumbersPerBoard", JSON.stringify(
        Object.fromEntries(
          Object.entries(selectedNumbersPerBoard).map(([id, set]) => [id, [...set]])
        )
      ));
    }, 300);
  }, [activeBoards, selectedNumbers, selectedNumbersPerBoard]);

  // Win Check Handler
  const checkForWin = useCallback((boardId) => {
    let selectedSet, boardCartelaId;
    
    if (activeBoards.length === 1) {
      selectedSet = selectedNumbers;
      boardCartelaId = cartelaId;
    } else {
      selectedSet = selectedNumbersPerBoard[boardId] || new Set();
      const board = activeBoards.find(b => b.cartelaId === boardId);
      boardCartelaId = boardId;
    }

    socket.emit("checkWinner", {
      telegramId,
      gameId,
      GameSessionId,
      cartelaId: boardCartelaId,
      selectedNumbers: Array.from(selectedSet),
    });
  }, [activeBoards, selectedNumbers, selectedNumbersPerBoard, telegramId, gameId, GameSessionId, cartelaId]);

  // Navigation Handlers
  const navigateToAddBoard = useCallback(() => {
    if (activeBoards.length >= BINGO_CONFIG.MAX_BOARDS) {
      setGameState(prev => ({ ...prev, showAddBoardWarning: true }));
      return;
    }

    if (gameState.countdown < BINGO_CONFIG.COUNTDOWN_THRESHOLD) {
      setGameState(prev => ({ ...prev, showAddBoardWarning: true }));
      return;
    }

    navigate("/add-board", {
      state: {
        telegramId,
        gameId,
        GameSessionId,
        existingBoards: activeBoards,
        countdown: gameState.countdown
      }
    });
  }, [gameState.countdown, navigate, telegramId, gameId, GameSessionId, activeBoards]);

  const handleLeaveGame = useCallback(() => {
    socket.emit("playerLeave", { gameId: String(gameId), GameSessionId, telegramId }, () => {
      navigate("/");
    });
  }, [gameId, GameSessionId, telegramId, navigate]);

  const handleRefresh = useCallback(() => {
    if (gameId && telegramId) {
      socket.emit("joinGame", { gameId, telegramId, GameSessionId });
    } else {
      window.location.reload();
    }
  }, [gameId, telegramId, GameSessionId]);

  // Audio Toggle Handler
  const toggleAudio = useCallback(() => {
    if (!gameState.isAudioOn) {
      const audio = new Audio(`/audio/audio1.mp3`);
      audio.volume = 0;
      audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          setGameState(prev => ({ ...prev, isAudioOn: true }));
        })
        .catch((err) => {
          console.warn("❌ Audio unlock failed:", err);
        });
    } else {
      setGameState(prev => ({ ...prev, isAudioOn: false }));
    }
  }, [gameState.isAudioOn]);

  // Load/Save Audio Preference
  useEffect(() => {
    const savedAudioState = localStorage.getItem("isAudioOn");
    if (savedAudioState !== null) {
      setGameState(prev => ({ ...prev, isAudioOn: savedAudioState === "true" }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("isAudioOn", gameState.isAudioOn);
  }, [gameState.isAudioOn]);

  // Recent calls display
  const recentCalls = useMemo(() => 
    gameState.randomNumbers.slice(-4, -1),
    [gameState.randomNumbers]
  );

  return (
    <div className="bg-gradient-to-b from-[#1a002b] via-[#2d003f] to-black min-h-screen flex flex-col items-center p-1 pb-3 w-full max-w-screen overflow-hidden">
      {/* Header Stats */}
      <GameStats
        playersCount={gameDetails.playersCount}
        winAmount={gameDetails.winAmount}
        callNumberLength={gameState.callNumberLength}
        stakeAmount={gameDetails.stakeAmount}
        isAudioOn={gameState.isAudioOn}
        onToggleAudio={toggleAudio}
      />

      {/* Main Content Area */}
      <div className="flex flex-wrap w-full mt-1">
        {/* Called Numbers Grid */}
        <CalledNumbersGrid calledNumbers={gameState.calledNumbers} />

        {/* Game Controls and Boards */}
        <div className="w-[55%] flex flex-col items-center gap-1">
          {/* Countdown Timer */}
          <div className="bg-gray-300 p-2 rounded-lg text-center text-xs w-[90%] flex-row flex items-center h-[7%] justify-around">
            <p>Countdown</p>
            <p className="text-lg font-bold">{gameState.countdown > 0 ? gameState.countdown : "Wait"}</p>
          </div>

          {/* Current Number Display */}
          <div className="bg-gradient-to-b from-purple-800 to-purple-900 rounded-lg text-white flex flex-row justify-around items-center w-full max-w-md mx-auto">
            <p className="font-bold text-xs">Current Number</p>
            <div className="flex justify-center items-center gap-4">
              <div className="w-14 h-14 flex items-center justify-center text-xl font-extrabold rounded-full shadow-[0_0_20px_#37ebf3] bg-[#37ebf3] text-purple-900">
                {gameState.lastCalledLabel || "-"}
              </div>
            </div>
          </div>

          {/* Recent Calls */}
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-2 rounded-lg w-full max-w-md mx-auto">
            <p className="text-center font-bold text-xs sm:text-sm text-yellow-400 md:text-base mb-1">Recent Calls</p>
            <div className="flex justify-center gap-2 sm:gap-4">
              {recentCalls.map((num, index) => {
                const colors = ["bg-red-800", "bg-green-800", "bg-blue-800"];
                return (
                  <div
                    key={index}
                    className={`w-6 h-6 sm:w-6 sm:h-6 md:w-6 md:h-6 flex items-center justify-center text-base text-xs md:text-sm font-extrabold rounded-full shadow-xl text-white ${colors[index]}`}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bingo Boards */}
          <div className="w-full space-y-4">
            {activeBoards.map((board, boardIndex) => (
              <BingoBoard
                key={board.cartelaId}
                board={board}
                boardId={board.cartelaId}
                boardIndex={boardIndex}
                selectedNumbers={selectedNumbersPerBoard[board.cartelaId] || new Set()}
                onCellClick={handleCartelaClick}
                onBingo={checkForWin}
              />
            ))}
          </div>

          {/* Add Board Button */}
          {activeBoards.length < BINGO_CONFIG.MAX_BOARDS && (
            <button
              onClick={navigateToAddBoard}
              className="w-[95%] bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 px-4 py-2 text-white rounded-4xl text-lg font-bold shadow-lg transition-all duration-200 mb-2"
            >
              + Add Another Board
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex gap-3 justify-center mt-3">
        <button
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 px-14 h-8 text-white rounded-full text-sm font-semibold shadow-md transition-all duration-200"
          onClick={handleRefresh}
        >
          Refresh
        </button>
        <button
          onClick={handleLeaveGame}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 px-14 h-8 text-white rounded-full text-sm font-semibold shadow-md transition-all duration-200"
        >
          Leave
        </button>
      </div>

      {/* Modals */}
      {gameState.showAddBoardWarning && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm mx-4">
            <h3 className="text-lg font-bold mb-2">
              {activeBoards.length >= BINGO_CONFIG.MAX_BOARDS ? "Maximum Boards Reached" : "Cannot Add Board"}
            </h3>
            <p className="text-gray-600 mb-4">
              {activeBoards.length >= BINGO_CONFIG.MAX_BOARDS 
                ? `You can only have up to ${BINGO_CONFIG.MAX_BOARDS} boards.`
                : `Countdown is too low (${gameState.countdown}s). You cannot add boards when countdown is below ${BINGO_CONFIG.COUNTDOWN_THRESHOLD} seconds.`
              }
            </p>
            <button
              onClick={() => setGameState(prev => ({ ...prev, showAddBoardWarning: false }))}
              className="w-full bg-orange-500 text-white py-2 rounded-lg font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {gameState.isGameEnd && (
        <div className="fixed inset-0 flex items-center justify-center bg-opacity-80 backdrop-blur-sm z-50 transition-opacity duration-300">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              🎉 Game Over
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              The game has ended. You may now leave the room.
            </p>
            <button
              className="w-1/2 bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-white rounded-lg text-lg font-semibold shadow-md"
              onClick={handleLeaveGame}
            >
              Leave Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BingoGame;