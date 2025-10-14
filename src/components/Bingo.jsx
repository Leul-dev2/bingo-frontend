import bingoCards from "../assets/bingoCards.json";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocation } from "react-router-dom";

function Bingo({isBlackToggleOn, setCartelaIdInParent, cartelaId, socket, otherSelectedCards, setOtherSelectedCards, emitLockRef }) {
  // URL parameters and localStorage management
  const [searchParams] = useSearchParams();
  const urlTelegramId = searchParams.get("user");
  const urlGameId = searchParams.get("game");
  const location = useLocation();
  const prevPathRef = useRef(null);

  // Store only if changed
  useEffect(() => {
    const storedTelegramId = localStorage.getItem("telegramId");
    const storedGameId = localStorage.getItem("gameChoice");

    if (urlTelegramId && urlTelegramId !== storedTelegramId) {
      localStorage.setItem("telegramId", urlTelegramId);
    }

    if (urlGameId && urlGameId !== storedGameId) {
      localStorage.setItem("gameChoice", urlGameId);
    }
  }, [urlTelegramId, urlGameId]);

  // Use URL value if available, otherwise fallback to localStorage
  const telegramId = urlTelegramId || localStorage.getItem("telegramId");
  const gameId = urlGameId || localStorage.getItem("gameChoice");

  // State management
  const navigate = useNavigate();
  const [cartela, setCartela] = useState([]);
  const [gameStatus, setGameStatus] = useState(false);
  const [userBalance, setUserBalance] = useState(null);
  const [bonusBalance, setUserBonusBalance] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
  const [response, setResponse] = useState("");
  const [count, setCount] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const hasInitialSyncRun = useRef(false);
  const lastRequestIdRef = useRef(0);

  // ✅ NEW: Queue state management
  const [queuePosition, setQueuePosition] = useState(null);
  const [queueLength, setQueueLength] = useState(0);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(0);
  const [isInQueue, setIsInQueue] = useState(false);
  const [activeGameInfo, setActiveGameInfo] = useState(null);

  // Theme variables
  const bgGradient = isBlackToggleOn
    ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
    : 'bg-gradient-to-br from-violet-300 via-purple-400 to-indigo-500'

  const alertBg = isBlackToggleOn ? 'bg-red-900' : 'bg-red-100';
  const alertText = isBlackToggleOn ? 'text-red-300' : 'text-red-700';
  const alertBorder = isBlackToggleOn ? 'border-red-700' : 'border-red-500';

  const myCardBg = isBlackToggleOn ? 'bg-green-600 text-white' : 'bg-green-500 text-white';
  const otherCardBg = isBlackToggleOn ? 'bg-yellow-600 text-black' : 'bg-yellow-400 text-black';
  const defaultCardBg = isBlackToggleOn ? 'bg-gray-700 text-white' : 'bg-purple-100 text-black';

  const cellBg = isBlackToggleOn ? 'bg-gray-800 text-white' : 'bg-purple-100 text-black';

  const refreshBtnBg = isBlackToggleOn ? 'bg-blue-700' : 'bg-blue-500';
  const startBtnEnabledBg = isBlackToggleOn ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-500 hover:bg-orange-600';
  const startBtnDisabledBg = 'bg-gray-600 cursor-not-allowed';

  // ✅ NEW: Queue status colors
  const queueActiveBg = isBlackToggleOn ? 'bg-purple-800' : 'bg-purple-500';
  const queueWaitingBg = isBlackToggleOn ? 'bg-yellow-800' : 'bg-yellow-500';

  // Fetch User Balance from REST
  const fetchUserData = async (id) => {
    try {
      const res = await fetch(`https://bingo-backend-8929.onrender.com/api/users/getUser?telegramId=${telegramId}`);
      if (!res.ok) throw new Error("User not found");
      const data = await res.json();
      setUserBalance(data.balance);
      setUserBonusBalance(data.bonus_balance);
    } catch (err) {
      console.error(err);
      setAlertMessage("Error fetching user data.");
    }
  };

  // ✅ NEW: Format wait time for display
  const formatWaitTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds} sec`;
    } else {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes} min`;
    }
  };

  // ✅ NEW: Leave queue function
  const leaveQueue = () => {
    if (socket && gameId && telegramId) {
      socket.emit("leaveQueue", { gameId, telegramId });
      setIsInQueue(false);
      setQueuePosition(null);
      setQueueLength(0);
      setEstimatedWaitTime(0);
      setAlertMessage("You have left the queue");
    }
  };

  // ✅ NEW: Get queue info
  const getQueueInfo = () => {
    if (socket && gameId) {
      socket.emit("getQueueInfo", { gameId });
    }
  };

  // Initial Effect to Fetch & Setup Socket
  useEffect(() => {
    if (!telegramId || !gameId) {
      console.error("Missing telegramId or gameId for game page.");
      navigate('/');
      return;
    }

    const handleCardSelections = (cards) => {
      const reformatted = {};

      if (lastRequestIdRef.current > 0) {
        return;
      }
      
      for (const [cardId, tId] of Object.entries(cards)) {
        // ✅ FIXED: Only add cards from OTHER players to otherSelectedCards
        if (tId !== telegramId) {
          reformatted[tId] = parseInt(cardId);
        }
      }

      setOtherSelectedCards(reformatted);
    };

    const handleCardReleased = ({ telegramId: releasedTelegramId, cardId }) => {
      setOtherSelectedCards((prev) => {
        const newState = { ...prev };
        if (newState[releasedTelegramId] === cardId) {
          delete newState[releasedTelegramId];
        }
        return newState;
      });
    };

    const handleInitialCardStates = (data) => {
      const { takenCards } = data;

      if (lastRequestIdRef.current > 0) {
        return;
      }

      const newOtherSelectedCardsMap = {};
      for (const cardId in takenCards) {
        const takenByTelegramId = takenCards[cardId].takenBy;
        // ✅ FIXED: Only add cards from OTHER players
        if (takenByTelegramId !== telegramId) {
          newOtherSelectedCardsMap[takenByTelegramId] = Number(cardId);
        }
      }
      setOtherSelectedCards(newOtherSelectedCardsMap);

      // Restore User's Own Card
      const mySavedCardId = sessionStorage.getItem("mySelectedCardId");
      if (mySavedCardId && !isNaN(Number(mySavedCardId))) {
        const numMySavedCardId = Number(mySavedCardId);
        const selectedCardData = bingoCards.find(card => card.id === numMySavedCardId);
        if (selectedCardData) {
          setCartela(selectedCardData.card);
          setCartelaIdInParent(numMySavedCardId);
        } else {
          sessionStorage.removeItem("mySelectedCardId");
          setCartela([]);
          setCartelaIdInParent(null);
        }
      } else {
        setCartela([]);
        setCartelaIdInParent(null);
      }

      hasInitialSyncRun.current = true;
    };

    // ✅ NEW: Queue event handlers
    const handleQueuePosition = (data) => {
      setQueuePosition(data.position);
      setQueueLength(data.totalInQueue);
      setEstimatedWaitTime(data.estimatedWaitTime || 0);
      setIsInQueue(true);
      console.log(`🎯 Queue position: ${data.position}/${data.totalInQueue}, wait: ${data.estimatedWaitTime}ms`);
    };

    const handleQueueJoined = (data) => {
      setQueuePosition(data.position);
      setQueueLength(data.totalInQueue);
      setEstimatedWaitTime(data.estimatedWaitTime || 0);
      setIsInQueue(true);
      setAlertMessage(`Joined queue! Position: ${data.position}`);
    };

    const handleQueueLeft = (data) => {
      setIsInQueue(false);
      setQueuePosition(null);
      setQueueLength(0);
      setEstimatedWaitTime(0);
      setAlertMessage(data.message || "Left queue");
    };

    const handleQueueInfo = (data) => {
      console.log("Queue info:", data);
      // Update queue display information
    };

    const handleEnteringGame = (data) => {
      console.log("🎮 Entering game from queue:", data);
      setIsInQueue(false);
      setQueuePosition(null);
      setQueueLength(0);
      setEstimatedWaitTime(0);
      
      // Navigate to game page with the provided session ID
      navigate("/game", {
        state: {
          gameId: data.gameId,
          telegramId,
          GameSessionId: data.GameSessionId,
          cartelaId,
          cartela,
          playerCount: data.playersInGame,
          stakeAmount: data.stakeAmount
        },
      });
    };

    const handleQueueError = (data) => {
      setAlertMessage(data.message || "Queue error occurred");
      setIsInQueue(false);
    };

    const performInitialGameSync = () => {
      if (socket.connected && telegramId && gameId) {
        socket.emit("userJoinedGame", { telegramId, gameId });
      }
    };

    // Socket event listeners
    socket.on("initialCardStates", handleInitialCardStates);
    socket.on("userconnected", (res) => { setResponse(res.telegramId); });
    socket.on("balanceUpdated", (newBalance) => { setUserBalance(newBalance); });
    socket.on("gameStatusUpdate", (status) => { 
      setGameStatus(status);
    });
    socket.on("currentCardSelections", handleCardSelections);
    socket.on("cardConfirmed", (data) => {
      // Ignore stale confirmations
      if (data.requestId !== lastRequestIdRef.current) {
        return;
      }

      const confirmedCardId = Number(data.cardId);
      setCartelaIdInParent(confirmedCardId);
      setCartela(data.card);
      sessionStorage.setItem("mySelectedCardId", data.cardId);
      setGameStatus("Ready to Start");
      lastRequestIdRef.current = 0;
    });

    socket.on("cardUnavailable", ({ cardId }) => {
      setAlertMessage(`🚫 Card ${cardId} is already taken by another player.`);
      setCartela([]);
      setCartelaIdInParent(null);
      sessionStorage.removeItem("mySelectedCardId");
    });

    socket.on("cardError", ({ message }) => {
      setAlertMessage(message || "Card selection failed.");
      setCartela([]);
      setCartelaIdInParent(null);
      sessionStorage.removeItem("mySelectedCardId");
      lastRequestIdRef.current = 0;
    });

    socket.on("cardReleased", handleCardReleased);
    socket.on("gameid", (data) => { setCount(data.numberOfPlayers); });
    socket.on("error", (err) => {
      console.error(err);
      setAlertMessage(err.message);
    });
    socket.on("cardsReset", ({ gameId: resetGameId }) => {
      if (resetGameId === gameId) {
        setOtherSelectedCards({});
        setCartela([]);
        setCartelaIdInParent(null);
        sessionStorage.removeItem("mySelectedCardId");
        hasInitialSyncRun.current = false;
      }
    });

    // ✅ NEW: Queue event listeners
    socket.on("queuePosition", handleQueuePosition);
    socket.on("queueJoined", handleQueueJoined);
    socket.on("queueLeft", handleQueueLeft);
    socket.on("queueInfo", handleQueueInfo);
    socket.on("enteringGame", handleEnteringGame);
    socket.on("queueError", handleQueueError);

    const handleConnectForSync = () => {
      if (!hasInitialSyncRun.current) {
        performInitialGameSync();
      }
    };
    
    socket.on("connect", handleConnectForSync);
    socket.on("disconnect", () => {
      hasInitialSyncRun.current = false;
    });

    performInitialGameSync();
    fetchUserData(telegramId);

    return () => {
      socket.off("userconnected");
      socket.off("initialCardStates", handleInitialCardStates);
      socket.off("balanceUpdated");
      socket.off("gameStatusUpdate");
      socket.off("currentCardSelections", handleCardSelections);
      socket.off("cardConfirmed");
      socket.off("cardUnavailable");
      socket.off("cardError");
      socket.off("cardReleased", handleCardReleased);
      socket.off("gameid");
      socket.off("error");
      socket.off("cardsReset");
      socket.off("connect", handleConnectForSync);
      
      // ✅ NEW: Clean up queue listeners
      socket.off("queuePosition", handleQueuePosition);
      socket.off("queueJoined", handleQueueJoined);
      socket.off("queueLeft", handleQueueLeft);
      socket.off("queueInfo", handleQueueInfo);
      socket.off("enteringGame", handleEnteringGame);
      socket.off("queueError", handleQueueError);
      
      hasInitialSyncRun.current = false;
    };
  }, [telegramId, gameId, bingoCards, navigate, socket]); 

  const handleLocalCartelaIdChange = (newCartelaId) => {
    const selectedCard = bingoCards.find(card => card.id === newCartelaId);
    if (selectedCard) {
      setCartela(selectedCard.card);
      if (setCartelaIdInParent) {
        setCartelaIdInParent(newCartelaId);
      }
    } else {
      setCartela([]);
      if (setCartelaIdInParent) {
        setCartelaIdInParent(null);
      }
    }
  };

  // Select a bingo card
  const handleNumberClick = (number) => {
    if (emitLockRef.current && number === cartelaId) return;
    if (emitLockRef.current && number !== cartelaId) {
      emitLockRef.current = false;
    }

    const selectedCard = bingoCards.find(card => card.id === number);
    if (!selectedCard) {
      console.error("Card not found for ID:", number);
      handleLocalCartelaIdChange(null);
      return;
    }

    lastRequestIdRef.current += 1;
    const requestId = lastRequestIdRef.current;
    emitLockRef.current = true;

    // Optimistic UI update
    handleLocalCartelaIdChange(number);
    setCartela(selectedCard.card);
    setGameStatus("Ready to Start");

    socket.emit("cardSelected", {
      telegramId,
      gameId,
      cardId: number,
      card: selectedCard.card,
      requestId
    });
  };

  useEffect(() => {
    socket.on("gameStart", () => {
      setGameStarted(true);
    });

    return () => {
      socket.off("gameStart");
    };
  }, []);

  useEffect(() => {
    socket.on("gameFinished", () => {
      setGameStarted(false);
    });

    return () => {
      socket.off("gameFinished");
    };
  }, []);

  const resetGame = () => {
    window.location.reload();
  };

  useEffect(() => {
    socket.on("gameEnded", () => {
      setGameStarted(false);
      setIsStarting(false);
      setAlertMessage("");
      sessionStorage.removeItem("mySelectedCardId");
    });

    return () => socket.off("gameEnded");
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`https://bingo-backend-8929.onrender.com/api/games/${gameId}/status`);
        const data = await res.json();

        if (!data.isActive) {
          setIsStarting(false);
          setGameStarted(false);
        } else {
          setIsStarting(true);
          setGameStarted(true);
        }
      } catch (error) {
        console.error("Status polling failed:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [gameId]);

  // 🟢 UPDATED: Start Game with Queue Integration
  const startGame = async () => {
    if (isStarting || isInQueue) return;

    setIsStarting(true);

    try {
      const response = await fetch("https://bingo-backend-8929.onrender.com/api/games/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gameId, telegramId, cardId: cartelaId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { GameSessionId: currentSessionId } = data;

        // ✅ Player is automatically added to queue via userJoinedGame event
        // The queue management happens automatically in the socket backend
        setAlertMessage("Joined game queue! Waiting for players...");

        // The actual game joining will happen via the "enteringGame" socket event
        // when the queue system starts a game with this player

      } else if (data.message && data.message.includes("already running")) {
        // Game is already running - show error message
        setAlertMessage("🚫 Game has already started! Please wait for the next game.");
      } else {
        setAlertMessage(data.message || data.error || "Error starting the game");
        console.error("Game start error:", data.error);
      }
    } catch (error) {
      setAlertMessage("Error connecting to the backend");
      console.error("Connection error:", error);
    } finally {
      setIsStarting(false);
    }
  };

  // ✅ NEW: Render queue status component
  const renderQueueStatus = () => {
    if (!isInQueue) return null;

    return (
      <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-40 ${queueWaitingBg} text-white p-4 rounded-lg shadow-lg max-w-sm w-full mx-4`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-lg">🎯 In Queue</h3>
          <button 
            onClick={leaveQueue}
            className="text-white hover:text-gray-200 text-sm bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
          >
            Leave
          </button>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Position:</span>
            <span className="font-bold">{queuePosition} / {queueLength}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Estimated Wait:</span>
            <span className="font-bold">{formatWaitTime(estimatedWaitTime)}</span>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, (queuePosition / Math.max(queueLength, 1)) * 100)}%` }}
            ></div>
          </div>
          
          <p className="text-xs text-center mt-2 opacity-80">
            {queuePosition <= 2 ? "Game starting soon..." : "Waiting for players..."}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`flex flex-col items-center p-3 pb-20 min-h-screen ${bgGradient} text-white w-full overflow-hidden`}>
        {alertMessage && (
          <div className="fixed top-0 left-0 w-full flex justify-center z-50">
            <div className={`flex items-center max-w-sm w-full p-3 m-2 ${alertBg} ${alertBorder} border-l-4 ${alertText} rounded-md shadow-lg`}>
              <svg className={`w-5 h-5 mr-2 ${alertText}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8 8 3.582 8 8zM9 7a1 1 0 012 0v3a1 1 0 01-2 0V7zm1 6a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
              <span className="flex-1 text-sm">{alertMessage}</span>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setAlertMessage("")}>
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ✅ Queue Status Display */}
        {renderQueueStatus()}

        <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 w-full max-w-xl text-white text-center mb-2">
          {/* Balance Card */}
          <div className="flex flex-col justify-center bg-[#3D74B6] max-h-[24vh] rounded-2xl shadow-lg transition-transform transform hover:scale-105">
            <p className="text-sm sm:text-base font-semibold tracking-wide opacity-90">
              Balance
            </p>
            <span className="text-md sm:text-md font-extrabold block">
              {userBalance !== null ? `${userBalance} ብር` : "Loading..."}
            </span>
          </div>

          {/* Bonus Balance Card */}
          <div className="flex flex-col justify-center bg-[#51B33B] max-h-[24vh] rounded-2xl shadow-lg transition-transform transform hover:scale-105">
            <p className="text-sm sm:text-base font-semibold tracking-wide opacity-90">
              Bonus
            </p>
            <span className="text-md sm:text-md font-extrabold block">
              {bonusBalance !== null ? `${bonusBalance} ብር` : "Loading..."}
            </span>
          </div>

          {/* Game Count Card - UPDATED for queue status */}
          <div className={`flex flex-col justify-center items-center max-h-[24vh] shadow-lg rounded-2xl transition-transform transform hover:scale-105 ${
            isInQueue ? queueActiveBg : gameStarted ? 'bg-red-600' : 'bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-400'
          }`}>
            {isInQueue ? (
              <button className="flex flex-col justify-center items-center text-white font-extrabold text-lg sm:text-xl transition-transform transform hover:scale-105">
                <span>Queue</span>
                <span className="animate-pulse">⏳</span>
              </button>
            ) : gameStarted ? (
              <button className="flex flex-col justify-center items-center text-white font-extrabold text-lg sm:text-xl transition-transform transform hover:scale-105">
                <span>Wait 🛑</span>
              </button>
            ) : (
              <button className="flex flex-col justify-center items-center text-white font-extrabold text-lg sm:text-xl transition-transform transform hover:scale-105">
                <span>PLAY</span>
                <span className="animate-bounce">▶️</span>
              </button>
            )}
          </div>

          {/* Game Choice Card */}
          <div className="flex flex-col justify-center bg-[#FFD93D] max-h-[24vh] rounded-2xl shadow-lg transition-transform transform hover:scale-105">
            <p className="text-sm sm:text-base font-semibold tracking-wide opacity-90">
              ባለ
            </p>
            <span className="text-lg sm:text-xl font-extrabold block">
              {gameId}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-10 gap-1 py-1 px-2 max-w-lg w-full text-xs">
          {numbers.map((num) => {
            const isMyCard = cartelaId === num;
            const isOtherCard = Object.entries(otherSelectedCards).some(
              ([id, card]) => Number(card) === num
            );

            return (
              <button
                key={num}
                onClick={() => handleNumberClick(num)}
                disabled={isOtherCard || isInQueue}
                className={`w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 font-bold cursor-pointer transition-all duration-200 text-xs
                           ${isMyCard ? myCardBg : isOtherCard ? otherCardBg : defaultCardBg}
                           ${isInQueue ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {num}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 items-center mt-2">
          {cartela.length > 0 && (
            <div className="grid grid-cols-5 gap-1 p-1 bg-transparent text-white">
              {cartela.flat().map((num, index) => (
                <div key={index} className={`w-6 h-6 flex items-center justify-center border border-white rounded-lg text-xs font-bold ${cellBg}`}>
                  {num}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <button 
              onClick={resetGame} 
              className={`${refreshBtnBg} text-white px-3 py-1 rounded-lg shadow-md text-sm`}
            >
              Refresh
            </button>
            <button
              onClick={isInQueue ? leaveQueue : startGame}
              disabled={(!cartelaId || isStarting) && !isInQueue}
              className={`${
                isInQueue 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : !cartelaId || isStarting 
                    ? startBtnDisabledBg 
                    : startBtnEnabledBg
              } text-white px-3 py-1 rounded-lg shadow-md text-sm`}
            >
              {isInQueue ? "Leave Queue" : isStarting ? "Starting..." : "Start Game"}
            </button>
          </div>
        </div>

        {/* ✅ Queue Information Display */}
        {isInQueue && (
          <div className="mt-4 p-3 bg-black bg-opacity-30 rounded-lg max-w-sm w-full">
            <div className="text-center">
              <p className="text-sm opacity-80">Waiting for players to join...</p>
              <p className="text-xs mt-1 opacity-60">
                You will automatically enter the game when ready
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Bingo;