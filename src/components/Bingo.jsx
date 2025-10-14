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
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const [queuePosition, setQueuePosition] = useState(null);
  const [totalInQueue, setTotalInQueue] = useState(0);
  const [isEnteringGame, setIsEnteringGame] = useState(false);
  const [hasJoinedQueue, setHasJoinedQueue] = useState(false);
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
  const [response, setResponse] = useState("");
  const [count, setCount] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const hasInitialSyncRun = useRef(false);
  const lastRequestIdRef = useRef(0); 

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

  // ✅ NEW: Socket event for queue position
  useEffect(() => {
    const handleQueuePosition = ({ position, totalInQueue }) => {
      console.log(`🎯 Queue position: ${position}/${totalInQueue}`);
      setQueuePosition(position);
      setTotalInQueue(totalInQueue);
      
      if (position === 1 && totalInQueue >= 2) {
        setAlertMessage("🎉 You're next in line! Game starting soon...");
      }
    };

    // ✅ NEW: Socket event for entering game
    const handleEnteringGame = ({ gameId, GameSessionId, playersInGame }) => {
      console.log(`🚀 Entering game with session: ${GameSessionId}`);
      setIsEnteringGame(true);
      setAlertMessage(`🎮 Entering game with ${playersInGame - 1} other players...`);
      
      // Navigate to game after a short delay to show the message
      setTimeout(() => {
        navigate("/game", {
          state: {
            gameId,
            telegramId,
            GameSessionId,
            cartelaId,
            cartela,
            playerCount: playersInGame,
            preserveSocket: true
          },
        });
      }, 2000);
    };

    // ✅ NEW: Socket event for game ending
    const handleGameEnding = ({ gameId, GameSessionId }) => {
      console.log("🏁 Game ending, returning to lobby...");
      setAlertMessage("🏁 Game completed! Returning to lobby...");
    };

    socket.on("queuePosition", handleQueuePosition);
    socket.on("enteringGame", handleEnteringGame);
    socket.on("gameEnding", handleGameEnding);

    return () => {
      socket.off("queuePosition", handleQueuePosition);
      socket.off("enteringGame", handleEnteringGame);
      socket.off("gameEnding", handleGameEnding);
    };
  }, [navigate, telegramId, gameId, cartelaId, cartela]);

  // ✅ NEW: Socket connection status monitoring
  useEffect(() => {
    const handleConnect = () => {
      console.log('✅ Bingo: Socket connected');
      setSocketConnected(true);
    };

    const handleDisconnect = () => {
      console.log('🔴 Bingo: Socket disconnected');
      setSocketConnected(false);
    };

    const handleReconnect = () => {
      console.log('🔄 Bingo: Socket reconnected');
      setSocketConnected(true);
      // Re-sync game state after reconnection
      if (telegramId && gameId && !hasInitialSyncRun.current) {
        performInitialGameSync();
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
  }, [telegramId, gameId]);

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

    const performInitialGameSync = () => {
      if (socket.connected && telegramId && gameId) {
        console.log('🔄 Performing initial game sync');
        socket.emit("userJoinedGame", { telegramId, gameId });
      } else {
        console.log('⏳ Waiting for socket connection before initial sync');
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

    const handleConnectForSync = () => {
      console.log('✅ Socket connected, performing initial sync');
      if (!hasInitialSyncRun.current && telegramId && gameId) {
        performInitialGameSync();
      }
    };
    
    socket.on("connect", handleConnectForSync);

    // ✅ NEW: Handle socket state recovery events
    const handleSocketStateRecovered = () => {
      console.log('✅ Bingo: Socket state recovered successfully');
    };

    const handleSocketStateRecoveryFailed = ({ message }) => {
      console.warn('⚠️ Bingo: Socket state recovery failed:', message);
      setAlertMessage("Connection issue. Please refresh the page.");
    };

    socket.on("socketStateRecovered", handleSocketStateRecovered);
    socket.on("socketStateRecoveryFailed", handleSocketStateRecoveryFailed);

    // Initialize connection and data
    if (socket.connected) {
      performInitialGameSync();
    } else {
      console.log('⏳ Socket not connected, waiting for connection...');
      socket.connect();
    }

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
      socket.off("socketStateRecovered", handleSocketStateRecovered);
      socket.off("socketStateRecoveryFailed", handleSocketStateRecoveryFailed);
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

  // ✅ UPDATED: Select a bingo card with socket state preservation
  const handleNumberClick = (number) => {
    if (!socketConnected) {
      setAlertMessage("Connection lost. Please wait for reconnection.");
      return;
    }

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

    // ✅ ADDED: Preserve socket state before selection
    socket.emit("preserveSocketState", {
      telegramId,
      gameId,
      currentPhase: 'lobby'
    });

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
    // ✅ ADDED: Preserve socket state before refresh
    socket.emit("preserveSocketState", {
      telegramId,
      gameId,
      currentPhase: 'lobby'
    });
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

  // ✅ UPDATED: Start Game with queue system
  const startGame = async () => {
    if (isStarting) return;

    if (!socketConnected) {
      setAlertMessage("Connection lost. Please wait for reconnection.");
      return;
    }

    if (!cartelaId) {
      setAlertMessage("Please select a card first!");
      return;
    }

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

        // ✅ ADDED: Preserve socket state before navigation
        socket.emit("preserveSocketState", {
          telegramId,
          gameId,
          GameSessionId: currentSessionId,
          currentPhase: 'lobby'
        });

        // Player is now in queue, set the flag
        setHasJoinedQueue(true);
        setAlertMessage("🎯 You've joined the queue! Waiting for your turn...");

        socket.emit("joinGame", {
          gameId,
          telegramId,
          GameSessionId: currentSessionId
        });

        // Don't navigate immediately - wait for enteringGame event
        console.log("Player added to queue, waiting for game entry...");

      } else if (data.message && data.message.includes("already running")) {
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

  // ✅ NEW: Get queue status text
  const getQueueStatus = () => {
    if (isEnteringGame) {
      return "🎮 Entering Game...";
    }
    
    if (queuePosition === null && hasJoinedQueue) {
      return "⏳ Joining queue...";
    }
    
    if (queuePosition === 1 && totalInQueue >= 2) {
      return "🎉 You're next! Starting soon...";
    }
    
    if (queuePosition && queuePosition <= totalInQueue) {
      return `🎯 Position: ${queuePosition} of ${totalInQueue}`;
    }
    
    if (hasJoinedQueue) {
      return "⏳ Waiting for players...";
    }
    
    return "Select a card and click Start";
  };

  // ✅ NEW: Get start button text and status
  const getStartButtonInfo = () => {
    if (isEnteringGame) {
      return { text: "Entering Game...", disabled: true };
    }
    
    if (!cartelaId) {
      return { text: "Select a Card First", disabled: true };
    }
    
    if (!socketConnected) {
      return { text: "Connecting...", disabled: true };
    }
    
    if (hasJoinedQueue && queuePosition && queuePosition > 1) {
      return { text: `In Queue (${queuePosition}/${totalInQueue})`, disabled: true };
    }
    
    if (hasJoinedQueue && queuePosition === 1 && totalInQueue >= 2) {
      return { text: "Starting Soon...", disabled: true };
    }
    
    if (hasJoinedQueue) {
      return { text: "Waiting in Queue...", disabled: true };
    }
    
    return { text: "Join Queue", disabled: false };
  };

  const startButtonInfo = getStartButtonInfo();

  return (
    <>
      <div className={`flex flex-col items-center p-3 pb-20 min-h-screen ${bgGradient} text-white w-full overflow-hidden`}>
        {/* ✅ NEW: Connection status indicator */}
        <div className={`fixed top-2 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg z-50 text-sm font-bold ${
          socketConnected ? 'bg-green-500 text-white' : 'bg-red-500 text-white animate-pulse'
        }`}>
          {socketConnected ? '🟢 Connected' : '🔴 Reconnecting...'}
        </div>

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

          {/* Queue Status Card */}
          <div className="flex flex-col justify-center items-center bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 max-h-[24vh] shadow-lg rounded-2xl transition-transform transform hover:scale-105">
            <div className="flex flex-col justify-center items-center text-white font-extrabold text-lg sm:text-xl">
              <span className="text-sm">QUEUE</span>
              <span className="text-xs mt-1">{getQueueStatus()}</span>
            </div>
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

        {/* Queue Info Banner */}
        {(hasJoinedQueue || isEnteringGame) && (
          <div className="w-full max-w-lg mb-4 p-3 bg-blue-500/20 border border-blue-500 rounded-lg">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-pulse">🎮</div>
              <div className="text-center">
                <p className="font-bold text-blue-300">{getQueueStatus()}</p>
                {queuePosition > 1 && (
                  <p className="text-xs text-blue-200 mt-1">
                    {totalInQueue >= 2 ? "Game in progress. You're in line for the next game!" : "Waiting for more players..."}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

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
                disabled={isOtherCard || !socketConnected || isEnteringGame || hasJoinedQueue}
                className={`w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 font-bold cursor-pointer transition-all duration-200 text-xs
                           ${isMyCard ? myCardBg : isOtherCard ? otherCardBg : defaultCardBg} 
                           ${(!socketConnected || isEnteringGame || hasJoinedQueue) ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={!socketConnected ? "Connection lost" : isEnteringGame ? "Entering game..." : hasJoinedQueue ? "In queue - cannot change card" : ""}
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
              disabled={!socketConnected || isEnteringGame}
              className={`${refreshBtnBg} text-white px-3 py-1 rounded-lg shadow-md text-sm ${(!socketConnected || isEnteringGame) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Refresh
            </button>
            <button
              onClick={startGame}
              disabled={startButtonInfo.disabled}
              className={`${
                startButtonInfo.disabled ? startBtnDisabledBg : startBtnEnabledBg
              } text-white px-3 py-1 rounded-lg shadow-md text-sm ${startButtonInfo.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {startButtonInfo.text}
            </button>
          </div>
        </div>

        {/* Queue Information */}
        {hasJoinedQueue && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg max-w-lg w-full">
            <h3 className="text-lg font-bold text-center mb-2">Queue Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Your Position:</span>
                <span className="font-bold">{queuePosition || 'Calculating...'}</span>
              </div>
              <div className="flex justify-between">
                <span>Players in Queue:</span>
                <span className="font-bold">{totalInQueue || 'Calculating...'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-bold ${
                  isEnteringGame ? 'text-green-400' : 
                  queuePosition === 1 ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {isEnteringGame ? 'Entering Game' : 
                   queuePosition === 1 ? 'Next in Line' : 'Waiting in Queue'}
                </span>
              </div>
            </div>
            
            {queuePosition > 1 && (
              <div className="mt-3 p-2 bg-yellow-500/20 rounded text-xs text-yellow-300 text-center">
                ⏳ You're in line for the next available game. Please wait patiently...
              </div>
            )}

            {queuePosition === 1 && totalInQueue >= 2 && (
              <div className="mt-3 p-2 bg-green-500/20 rounded text-xs text-green-300 text-center">
                🎉 You're next! Game will start soon...
              </div>
            )}

            {!queuePosition && (
              <div className="mt-3 p-2 bg-blue-500/20 rounded text-xs text-blue-300 text-center">
                🔄 Getting your position in queue...
              </div>
            )}
          </div>
        )}

        {/* How it works info */}
        {!hasJoinedQueue && (
          <div className="mt-4 p-4 bg-gray-800/30 rounded-lg max-w-lg w-full">
            <h3 className="text-lg font-bold text-center mb-2">How It Works</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-start space-x-2">
                <span>1.</span>
                <span>Select a bingo card from the grid above</span>
              </div>
              <div className="flex items-start space-x-2">
                <span>2.</span>
                <span>Click "Join Queue" to enter the waiting list</span>
              </div>
              <div className="flex items-start space-x-2">
                <span>3.</span>
                <span>Wait for your turn - games run one at a time</span>
              </div>
              <div className="flex items-start space-x-2">
                <span>4.</span>
                <span>When it's your turn, you'll automatically enter the game</span>
              </div>
            </div>
          </div>
        )}

        {/* Connection status info */}
        {!socketConnected && (
          <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-300 text-sm text-center">
            <p>🔄 Reconnecting to server...</p>
            <p className="text-xs mt-1">Please wait while we restore your connection</p>
          </div>
        )}
      </div>
    </>
  );
}

export default Bingo;