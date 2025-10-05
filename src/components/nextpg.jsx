import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../../socket";

// Optimized BingoCell component
const BingoCell = React.memo(({ num, isFreeSpace, isSelected, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center font-extrabold text-sm border border-gray-600 rounded cursor-pointer transition-colors ${
        isFreeSpace
          ? "bg-gradient-to-b from-green-400 to-green-600 text-white"
          : isSelected
          ? "bg-gradient-to-b from-green-400 to-green-600 text-white"
          : "bg-white text-black"
      }`}
    >
      {isFreeSpace ? "⭐" : num}
    </div>
  );
});

// Header Component
const GameHeader = ({ gameDetails, callNumberLength, isAudioOn, onAudioToggle }) => (
  <div className="grid grid-cols-5 gap-1 w-full text-white text-center mb-2">
    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-1 text-xs rounded">
      Game {gameDetails.gameCode || "DY1894"}
    </div>
    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-1 text-xs rounded">
      Derash {gameDetails.derash || "984"}
    </div>
    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-1 text-xs rounded">
      Players {gameDetails.playersCount || "123"}
    </div>
    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-1 text-xs rounded">
      Stake {gameDetails.stakeAmount || "10"}
    </div>
    <button
      onClick={onAudioToggle}
      className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-1 text-xs rounded"
    >
      Sound ({isAudioOn ? "🔊" : "🔇"})
    </button>
  </div>
);

// Called Numbers Grid Component
const CalledNumbersGrid = ({ calledSet }) => {
  const bingoColors = {
    B: "bg-yellow-500",
    I: "bg-green-500", 
    N: "bg-blue-500",
    G: "bg-red-500",
    O: "bg-purple-500",
  };

  return (
    <div className="grid grid-cols-5 bg-[#2a0047] p-1 gap-1 rounded-lg text-xs w-full">
      {["B", "I", "N", "G", "O"].map((letter) => (
        <div key={letter} className={`text-white text-center text-xs font-bold rounded-full h-4 w-6 ${bingoColors[letter]}`}>
          {letter}
        </div>
      ))}
      {[...Array(15)].map((_, rowIndex) =>
        ["B", "I", "N", "G", "O"].map((letter, colIndex) => {
          const number = rowIndex + 1 + colIndex * 15;
          const randomNumberLabel = `${letter}-${number}`;

          return (
            <div
              key={randomNumberLabel}
              className={`text-center text-xs rounded ${
                calledSet.has(randomNumberLabel)
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
};

// Countdown Component
const CountdownSection = ({ countdown, currentCall }) => (
  <div className="bg-gray-300 p-2 rounded-lg text-center text-xs w-full flex items-center justify-around h-8">
    <p>Count Down</p>
    <p className="text-lg font-bold">{countdown > 0 ? countdown : "Wait"}</p>
  </div>
);

// Current Call Component
const CurrentCallSection = ({ lastCalledLabel }) => (
  <div className="bg-gradient-to-b from-purple-800 to-purple-900 rounded-lg text-white flex justify-around items-center w-full p-2">
    <p className="font-bold text-xs">Current Call</p>
    <div className="w-12 h-12 flex items-center justify-center text-xl font-extrabold rounded-full shadow-[0_0_20px_#37ebf3] bg-[#37ebf3] text-purple-900">
      {lastCalledLabel || "-"}
    </div>
  </div>
);

// Recent Calls Component
const RecentCallsSection = ({ recentNumbers }) => (
  <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-2 rounded-lg w-full">
    <p className="text-center font-bold text-xs text-yellow-400 mb-1">Recent Calls</p>
    <div className="flex justify-center gap-2">
      {recentNumbers.map((num, index) => {
        const colors = ["bg-red-800", "bg-green-800", "bg-blue-800"];
        return (
          <div
            key={index}
            className="w-6 h-6 flex items-center justify-center text-xs font-extrabold rounded-full text-white shadow-xl"
            style={{ backgroundColor: colors[index] ? '' : '#4B5563' }}
          >
            {num}
          </div>
        );
      })}
    </div>
  </div>
);

// Bingo Board Component
const BingoBoard = ({ 
  board, 
  boardId, 
  boardIndex, 
  selectedNumbers, 
  onCellClick, 
  onBingoClick 
}) => {
  const bingoColors = {
    B: "bg-yellow-500",
    I: "bg-green-500",
    N: "bg-blue-500", 
    G: "bg-red-500",
    O: "bg-purple-500",
  };

  return (
    <div className="bg-gradient-to-b from-purple-800 to-purple-900 p-3 rounded-lg w-full">
      {/* Board Header */}
      <div className="text-center text-yellow-400 text-sm mb-2 font-bold">
        {boardIndex === 0 ? "PRIMARY BOARD" : "SECONDARY BOARD"}
      </div>
      
      {/* BINGO Header */}
      <div className="grid grid-cols-5 gap-1 mb-2">
        {["B", "I", "N", "G", "O"].map((letter) => (
          <div
            key={letter}
            className={`w-6 h-6 flex items-center justify-center font-bold text-white text-xs rounded-full ${bingoColors[letter]}`}
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
            const isSelectedNum = selectedNumbers.has(num);

            return (
              <BingoCell
                key={`${boardId}-${rowIndex}-${colIndex}`}
                num={num}
                isFreeSpace={isFreeSpace}
                isSelected={isSelectedNum}
                onClick={() => onCellClick(num, boardId)}
              />
            );
          })
        )}
      </div>

      {/* Bingo Button */}
      <button 
        onClick={() => onBingoClick(boardId)}
        className="w-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-2 text-white rounded-full text-sm font-bold shadow-lg mt-2"
      >
        BINGO! ({boardIndex === 0 ? "10" : "110"})
      </button>
    </div>
  );
};

// Main BingoGame Component
const BingoGame = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartela, cartelaId, gameId, telegramId, GameSessionId, selectedBoards } = location.state || {};

  // State management
  const [randomNumber, setRandomNumber] = useState([]);
  const [currentCall, setCurrentCall] = useState(null);
  const [selectedNumbers, setSelectedNumbers] = useState(new Set());
  const [countdown, setCountdown] = useState(0);
  const [calledSet, setCalledSet] = useState(new Set());
  const [playerCount, setPlayerCount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [winnerFound, setWinnerFound] = useState(false);
  const [hasEmittedGameCount, setHasEmittedGameCount] = useState(false);
  const [isGameEnd, setIsGameEnd] = useState(false);
  const [callNumberLength, setCallNumberLength] = useState(0);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [lastCalledLabel, setLastCalledLabel] = useState(null);
  const [showAddBoardWarning, setShowAddBoardWarning] = useState(false);

  // Multi-board states
  const [activeBoards, setActiveBoards] = useState([]);
  const [selectedNumbersPerBoard, setSelectedNumbersPerBoard] = useState({});

  const [gameDetails, setGameDetails] = useState({
    gameCode: "DY1894",
    derash: "984",
    playersCount: "123",
    stakeAmount: "10",
    winAmount: "-"
  });

  const hasJoinedRef = useRef(false);
  const saveTimeout = useRef(null);

  // Initialize boards
  useEffect(() => {
    if (selectedBoards && selectedBoards.length > 0) {
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

  // Socket event handlers
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    
    if (!hasJoinedRef.current && gameId && telegramId) {
      socket.emit("joinGame", { gameId, telegramId, GameSessionId });
      hasJoinedRef.current = true;
    }

    const handleSocketConnect = () => {
      if (gameId && telegramId) {
        socket.emit("joinGame", { gameId, telegramId, GameSessionId });
      }
    };

    const handlePlayerCountUpdate = ({ playerCount }) => setPlayerCount(playerCount);
    const handleCountdownTick = ({ countdown }) => setCountdown(countdown);
    const handleGameStart = () => setGameStarted(true);
    const handleGameEnd = () => setIsGameEnd(true);
    const handleGameReset = () => {
      setHasEmittedGameCount(false);
      setRandomNumber([]);
      setCalledSet(new Set());
      setSelectedNumbers(new Set());
      setSelectedNumbersPerBoard({});
      setCountdown(0);
      setGameStarted(false);
      setLastCalledLabel(null);
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
      }
    };

    const handleNumberDrawn = ({ number, label, callNumberLength }) => {
      setRandomNumber(prev => [...prev, number]);
      setCalledSet(prev => new Set(prev).add(label));
      setCallNumberLength(callNumberLength);
      setLastCalledLabel(label);

      if (isAudioOn) {
        playAudioForNumber(number);
      }
    };

    const handleBingoClaimFailed = ({ message, reason, telegramId, gameId, cardId, card, lastTwoNumbers, selectedNumbers }) => {
      navigate("/winnerFailed", { 
        state: { message, reason, telegramId, gameId, cardId, card, lastTwoNumbers, selectedNumbers } 
      });
    };

    const handleGameDetails = ({ winAmount, playersCount, stakeAmount }) => {
      setGameDetails(prev => ({
        ...prev,
        winAmount: winAmount || prev.winAmount,
        playersCount: playersCount || prev.playersCount,
        stakeAmount: stakeAmount || prev.stakeAmount
      }));
    };

    const handleWinnerConfirmed = ({ winnerName, prizeAmount, board, winnerPattern, boardNumber, playerCount, telegramId, gameId, GameSessionId }) => {
      navigate("/winnerPage", { 
        state: { winnerName, prizeAmount, board, winnerPattern, boardNumber, playerCount, telegramId, gameId, GameSessionId } 
      });
    };

    const handleWinnerError = () => {
      socket.emit("playerLeave", { gameId: String(gameId), GameSessionId, telegramId }, () => {
        navigate("/");
      });
    };

    // Event listeners
    socket.on("connect", handleSocketConnect);
    socket.on("playerCountUpdate", handlePlayerCountUpdate);
    socket.on("countdownTick", handleCountdownTick);
    socket.on("gameStart", handleGameStart);
    socket.on("gameEnd", handleGameEnd);
    socket.on("gameReset", handleGameReset);
    socket.on("drawnNumbersHistory", handleDrawnNumbersHistory);
    socket.on("numberDrawn", handleNumberDrawn);
    socket.on("gameDetails", handleGameDetails);
    socket.on("winnerConfirmed", handleWinnerConfirmed);
    socket.on("winnerError", handleWinnerError);
    socket.on("bingoClaimFailed", handleBingoClaimFailed);

    return () => {
      socket.off("connect", handleSocketConnect);
      socket.off("playerCountUpdate", handlePlayerCountUpdate);
      socket.off("countdownTick", handleCountdownTick);
      socket.off("gameStart", handleGameStart);
      socket.off("gameEnd", handleGameEnd);
      socket.off("gameReset", handleGameReset);
      socket.off("drawnNumbersHistory", handleDrawnNumbersHistory);
      socket.off("numberDrawn", handleNumberDrawn);
      socket.off("gameDetails", handleGameDetails);
      socket.off("winnerConfirmed", handleWinnerConfirmed);
      socket.off("winnerError", handleWinnerError);
      socket.off("bingoClaimFailed", handleBingoClaimFailed);
    };
  }, [gameId, telegramId, GameSessionId, navigate, isAudioOn]);

  // Audio functions
  const playAudioForNumber = (number) => {
    if (!isAudioOn) return;
    const audio = new Audio(`/audio/audio${number}.mp3`);
    audio.currentTime = 0;
    audio.play().catch(error => console.error(`Failed to play audio ${number}:`, error));
  };

  const handleAudioToggle = () => {
    if (!isAudioOn) {
      const audio = new Audio(`/audio/audio1.mp3`);
      audio.volume = 0;
      audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          setIsAudioOn(true);
        })
        .catch(err => {
          console.warn("Audio unlock failed:", err);
          alert("Audio could not be enabled. Please try clicking again.");
        });
    } else {
      setIsAudioOn(false);
    }
  };

  // Game logic
  useEffect(() => {
    if (playerCount >= 2 && !hasEmittedGameCount && !gameStarted) {
      socket.emit("gameCount", { gameId, GameSessionId });
      setHasEmittedGameCount(true);
    }
  }, [playerCount, gameStarted, hasEmittedGameCount, gameId]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Board interactions
  const handleCartelaClick = (num, boardId) => {
    if (activeBoards.length === 1) {
      const newSelection = new Set(selectedNumbers);
      if (newSelection.has(num)) {
        newSelection.delete(num);
      } else {
        newSelection.add(num);
      }
      setSelectedNumbers(newSelection);
      setSelectedNumbersPerBoard(prev => ({ ...prev, [boardId]: newSelection }));
    } else {
      setSelectedNumbersPerBoard(prev => {
        const newSelections = { ...prev };
        const currentBoardSelections = new Set(prev[boardId] || []);
        
        if (currentBoardSelections.has(num)) {
          currentBoardSelections.delete(num);
        } else {
          currentBoardSelections.add(num);
        }
        
        newSelections[boardId] = currentBoardSelections;
        return newSelections;
      });
    }

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      localStorage.setItem("selectedNumbers", JSON.stringify([...selectedNumbers]));
      localStorage.setItem("selectedNumbersPerBoard", JSON.stringify(
        Object.fromEntries(
          Object.entries(selectedNumbersPerBoard).map(([id, set]) => [id, [...set]])
        )
      ));
    }, 300);
  };

  const checkForWin = (boardId) => {
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

    socket.emit("checkWinner", {
      telegramId,
      gameId,
      GameSessionId,
      cartelaId: boardCartelaId,
      selectedNumbers: selectedArray,
    });
  };

  const navigateToAddBoard = () => {
    if (countdown < 10) {
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
  };

  // Load saved state
  useEffect(() => {
    const savedAudioState = localStorage.getItem("isAudioOn");
    if (savedAudioState !== null) {
      setIsAudioOn(savedAudioState === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("isAudioOn", isAudioOn);
  }, [isAudioOn]);

  const recentNumbers = randomNumber.slice(-3).length >= 3 ? randomNumber.slice(-3) : [64, 68, 72];

  return (
    <div className="bg-gradient-to-b from-[#1a002b] via-[#2d003f] to-black min-h-screen flex flex-col items-center p-2 pb-4 w-full max-w-screen overflow-hidden">
      {/* Header */}
      <GameHeader 
        gameDetails={gameDetails}
        callNumberLength={callNumberLength}
        isAudioOn={isAudioOn}
        onAudioToggle={handleAudioToggle}
      />

      <div className="flex flex-col md:flex-row w-full gap-2">
        {/* Left Column - Called Numbers */}
        <div className="w-full md:w-[45%]">
          <CalledNumbersGrid calledSet={calledSet} />
        </div>

        {/* Right Column - Game Controls & Boards */}
        <div className="w-full md:w-[55%] flex flex-col gap-2">
          <CountdownSection countdown={countdown} currentCall={currentCall} />
          <CurrentCallSection lastCalledLabel={lastCalledLabel} />
          <RecentCallsSection recentNumbers={recentNumbers} />

          {/* Bingo Boards */}
          <div className="space-y-3">
            {activeBoards.map((board, boardIndex) => (
              <BingoBoard
                key={board.cartelaId}
                board={board}
                boardId={board.cartelaId}
                boardIndex={boardIndex}
                selectedNumbers={selectedNumbersPerBoard[board.cartelaId] || new Set()}
                onCellClick={handleCartelaClick}
                onBingoClick={checkForWin}
              />
            ))}
          </div>

          {/* Add Board Button */}
          {activeBoards.length === 1 && (
            <button
              onClick={navigateToAddBoard}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-white rounded-full text-sm font-bold shadow-lg transition-colors"
            >
              + Add Board
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex gap-3 justify-center mt-3">
        <button
          className="bg-gradient-to-r from-blue-500 to-indigo-600 px-12 py-2 text-white rounded-full text-sm font-semibold shadow-md"
          onClick={() => {
            if (gameId && telegramId) {
              socket.emit("joinGame", { gameId, telegramId, GameSessionId });
            } else {
              window.location.reload();
            }
          }}
        >
          Refresh
        </button>
        <button
          onClick={() => {
            socket.emit("playerLeave", { gameId: String(gameId), GameSessionId, telegramId }, () => {
              navigate("/");
            });
          }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 px-12 py-2 text-white rounded-full text-sm font-semibold shadow-md"
        >
          Leave
        </button>
      </div>

      {/* Modals */}
      {showAddBoardWarning && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm mx-4">
            <h3 className="text-lg font-bold mb-2">Cannot Add Board</h3>
            <p className="text-gray-600 mb-4">
              Countdown is too low ({countdown}s). You cannot add boards when countdown is below 10 seconds.
            </p>
            <button
              onClick={() => setShowAddBoardWarning(false)}
              className="w-full bg-orange-500 text-white py-2 rounded-lg font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {isGameEnd && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🎉 Game Over</h2>
            <p className="text-gray-600 mb-6">The game has ended. You may now leave the room.</p>
            <button
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-white rounded-lg text-sm font-semibold"
              onClick={() => {
                socket.emit("playerLeave", { gameId: String(gameId), GameSessionId, telegramId }, () => {
                  navigate("/");
                });
              }}
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