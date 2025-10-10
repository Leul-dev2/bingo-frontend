import bingoCards from "../assets/bingoCards.json";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocation } from "react-router-dom";

function Bingo({isBlackToggleOn, setCartelaIdInParent, cartelaId, socket, otherSelectedCards, setOtherSelectedCards, emitLockRef }) {
  // Debug logging at component start
  console.log("🔵 Bingo Component Mounting - Props:", {
    cartelaId,
    otherSelectedCards,
    isBlackToggleOn
  });

  /////saving the telegram id and gamechoice in localstorage /////////////////////////////////////////////////////
  const [searchParams] = useSearchParams();
  const urlTelegramId = searchParams.get("user");
  const urlGameId = searchParams.get("game");
  const location = useLocation();
  const prevPathRef = useRef(null);

  // Store only if changed
  useEffect(() => {
    console.log("🟡 URL Params Effect - urlTelegramId:", urlTelegramId, "urlGameId:", urlGameId);
    const storedTelegramId = localStorage.getItem("telegramId");
    const storedGameId = localStorage.getItem("gameChoice");

    if (urlTelegramId && urlTelegramId !== storedTelegramId) {
      localStorage.setItem("telegramId", urlTelegramId);
      console.log("✅ Stored telegramId:", urlTelegramId);
    }

    if (urlGameId && urlGameId !== storedGameId) {
      localStorage.setItem("gameChoice", urlGameId);
      console.log("✅ Stored gameId:", urlGameId);
    }
  }, [urlTelegramId, urlGameId]);

  // Use URL value if available, otherwise fallback to localStorage
  const telegramId = urlTelegramId || localStorage.getItem("telegramId");
  const gameId = urlGameId || localStorage.getItem("gameChoice");

  console.log("🟡 Using IDs - telegramId:", telegramId, "gameId:", gameId);

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  
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
  const [isSocketReady, setIsSocketReady] = useState(false);
  const hasInitialSyncRun = useRef(false);
  const lastRequestIdRef = useRef(0); 

  const bgGradient = isBlackToggleOn
    ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
    : 'bg-gradient-to-br from-violet-300 via-purple-400 to-indigo-500'

  const alertBg = isBlackToggleOn ? 'bg-red-900' : 'bg-red-100';
  const alertText = isBlackToggleOn ? 'text-red-300' : 'text-red-700';
  const alertBorder = isBlackToggleOn ? 'border-red-700' : 'border-red-500';

  const cardBg = isBlackToggleOn ? 'bg-white/10' : 'bg-white';
  const cardText = isBlackToggleOn ? 'text-indigo-300' : 'text-purple-400';

  const myCardBg = isBlackToggleOn ? 'bg-green-600 text-white' : 'bg-green-500 text-white';
  const otherCardBg = isBlackToggleOn ? 'bg-yellow-600 text-black' : 'bg-yellow-400 text-black';
  const defaultCardBg = isBlackToggleOn ? 'bg-gray-700 text-white' : 'bg-purple-100 text-black';

  const cellBg = isBlackToggleOn ? 'bg-gray-800 text-white' : 'bg-purple-100 text-black';

  const refreshBtnBg = isBlackToggleOn ? 'bg-blue-700' : 'bg-blue-500';
  const startBtnEnabledBg = isBlackToggleOn ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-500 hover:bg-orange-600';
  const startBtnDisabledBg = 'bg-gray-600 cursor-not-allowed';

  // 🟢 Fetch User Balance from REST
  const fetchUserData = async (id) => {
    console.log("🟡 fetchUserData called with id:", id);
    try {
      const res = await fetch(`https://bingo-backend-8929.onrender.com/api/users/getUser?telegramId=${telegramId}`);
      console.log("🟡 User data response status:", res.status);
      if (!res.ok) throw new Error("User not found");
      const data = await res.json();
      console.log("✅ User data fetched:", data);
      setUserBalance(data.balance);
      setUserBonusBalance(data.bonus_balance);
    } catch (err) {
      console.error("❌ Error fetching user data:", err);
      setAlertMessage("Error fetching user data.");
    }
  };

  // 🟢 Initial Effect to Fetch & Setup Socket
  useEffect(() => {
    console.log("🟢 Initial Effect Running - telegramId:", telegramId, "gameId:", gameId);

    if (!telegramId || !gameId) {
      console.error("❌ Missing telegramId or gameId for game page.");
      navigate('/');
      return;
    }

    const handleCardSelections = (cards) => {
      console.log("💡 Initial card selections received:", cards);
      const reformatted = {};

      if (lastRequestIdRef.current > 0) {
        console.log("⚠ Skipping selections update due to pending request");
        return;
      }
      
      for (const [cardId, tId] of Object.entries(cards)) {
        if (tId === telegramId) {
          setCartelaIdInParent(parseInt(cardId));
          console.log("🍔🍔🍔 card is set", cardId);
        } else {
          reformatted[tId] = parseInt(cardId);
        }
      }

      setOtherSelectedCards(reformatted);
    };

    const handleCardReleased = ({ telegramId: releasedTelegramId, cardId }) => {
      console.log(`💡 Card ${cardId} released by ${releasedTelegramId}`);
      setOtherSelectedCards((prev) => {
        const newState = { ...prev };
        if (newState[releasedTelegramId] === cardId) {
          delete newState[releasedTelegramId];
        }
        return newState;
      });
    };

    const handleInitialCardStates = (data) => {
      console.log("💡 Frontend: Received initialCardStates (full board sync):", data);
      const { takenCards } = data;

      if (lastRequestIdRef.current > 0) {
        console.log("⚠ Skipping initial restore because a newer request is pending.");
        return;
      }

      const newOtherSelectedCardsMap = {};
      for (const cardId in takenCards) {
        const takenByTelegramId = takenCards[cardId].takenBy;
        newOtherSelectedCardsMap[takenByTelegramId] = Number(cardId);
      }
      setOtherSelectedCards(newOtherSelectedCardsMap);

      // Restore User's Own Card
      const mySavedCardId = sessionStorage.getItem("mySelectedCardId");
      console.log("🔥🔥🔥🔥 my saved card", mySavedCardId);
      if (mySavedCardId && !isNaN(Number(mySavedCardId))) {
        const numMySavedCardId = Number(mySavedCardId);
        const selectedCardData = bingoCards.find(card => card.id === numMySavedCardId);
        if (selectedCardData) {
          setCartela(selectedCardData.card);
          setCartelaIdInParent(numMySavedCardId);
          setOtherSelectedCards(prev => ({
            ...prev,
            [telegramId]: numMySavedCardId
          }));
        } else {
          sessionStorage.removeItem("mySelectedCardId");
          setCartela([]);
          setCartelaIdInParent(null);
          console.warn("Saved card ID not found in bingoCards data. Clearing saved selection.");
        }
      } else {
        setCartela([]);
        setCartelaIdInParent(null);
      }

      hasInitialSyncRun.current = true;
    };

    const performInitialGameSync = () => {
      console.log("🟡 Attempting initial game sync...");
      if (socket.connected && telegramId && gameId) {
        console.log(`Frontend: Emitting 'userJoinedGame' for gameId: ${gameId}`);
        socket.emit("userJoinedGame", { telegramId, gameId });
        console.log("✅ Sent emit [userJoinedGame]");
      }
    };

    // Socket event listeners
    socket.on("initialCardStates", handleInitialCardStates);
    socket.on("userconnected", (res) => { 
      console.log("✅ User connected:", res.telegramId);
      setResponse(res.telegramId); 
    });
    socket.on("balanceUpdated", (newBalance) => { 
      console.log("✅ Balance updated:", newBalance);
      setUserBalance(newBalance); 
    });
    socket.on("gameStatusUpdate", (status) => { 
      console.log("✅ Game status updated:", status);
      setGameStatus(status);
    });
    socket.on("currentCardSelections", handleCardSelections);
    socket.on("cardConfirmed", (data) => {
      console.log("✅ DEBUG: Frontend received cardConfirmed data:", data);

      if (data.requestId !== lastRequestIdRef.current) {
        console.warn(`⚠ Ignoring stale confirmation. Current: ${lastRequestIdRef.current}, Received: ${data.requestId}`);
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
      console.log("❌ Card unavailable:", cardId);
      setAlertMessage(`🚫 Card ${cardId} is already taken by another player.`);
      setCartela([]);
      setCartelaIdInParent(null);
      sessionStorage.removeItem("mySelectedCardId");
    });

    socket.on("cardError", ({ message }) => {
      console.log("❌ Card error:", message);
      setAlertMessage(message || "Card selection failed.");
      setCartela([]);
      setCartelaIdInParent(null);
      sessionStorage.removeItem("mySelectedCardId");
      lastRequestIdRef.current = 0;
    });

    socket.on("cardReleased", handleCardReleased);
    socket.on("gameid", (data) => { 
      console.log("✅ Player count received:", data.numberOfPlayers);
      setCount(data.numberOfPlayers); 
    });
    socket.on("error", (err) => {
      console.error("❌ Socket error:", err);
      setAlertMessage(err.message);
    });
    socket.on("cardsReset", ({ gameId: resetGameId }) => {
      console.log("🔄 Cards reset for game:", resetGameId);
      if (resetGameId === gameId) {
        setOtherSelectedCards({});
        setCartela([]);
        setCartelaIdInParent(null);
        sessionStorage.removeItem("mySelectedCardId");
        hasInitialSyncRun.current = false;
      }
    });

    const handleConnectForSync = () => {
      if (!hasInitialSyncRun.current) {
        console.log("✅ Socket connected, performing initial sync.");
        performInitialGameSync();
      }
    };
    
    socket.on("connect", handleConnectForSync);
    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected");
      hasInitialSyncRun.current = false;
    });

    performInitialGameSync();
    fetchUserData(telegramId);

    return () => {
      console.log("🟣 Cleaning up socket listeners");
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
      hasInitialSyncRun.current = false;
    };
  }, [telegramId, gameId, bingoCards, navigate, socket]); 

  const handleLocalCartelaIdChange = (newCartelaId) => {
    console.log(`🔍 Bingo.jsx: handleLocalCartelaIdChange called with: ${newCartelaId}`);
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

  // 🟢 Select a bingo card
  const handleNumberClick = (number) => {
    console.log("🟡 Clicked button ID:", number);
    console.log("🟡 Current cartelaId:", cartelaId);
    console.log("🟡 emitLockRef.current:", emitLockRef.current);

    if (emitLockRef.current && number === cartelaId) {
      console.log("⚠ Prevented double click on same card");
      return;
    }
    
    if (emitLockRef.current && number !== cartelaId) {
      emitLockRef.current = false;
    }

    const selectedCard = bingoCards.find(card => card.id === number);
    if (!selectedCard) {
      console.error("❌ Card not found for ID:", number);
      handleLocalCartelaIdChange(null);
      return;
    }

    lastRequestIdRef.current += 1;
    const requestId = lastRequestIdRef.current;
    emitLockRef.current = true;

    console.log(`🟡 Selecting card ${number} with requestId: ${requestId}`);

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
    
    console.log(`✅ Card ${number} emitted to backend with requestId: ${requestId}`);
  };

  useEffect(() => {
    socket.on("gameStart", () => {
      console.log("✅ Game started!");
      setGameStarted(true);
    });

    return () => {
      socket.off("gameStart");
    };
  }, []);

  useEffect(() => {
    socket.on("gameFinished", () => {
      console.log("✅ Game finished!");
      setGameStarted(false);
    });

    return () => {
      socket.off("gameFinished");
    };
  }, []);

  const resetGame = () => {
    console.log("🔄 Refreshing page...");
    window.location.reload();
  };

  useEffect(() => {
    socket.on("gameEnded", () => {
      console.log("✅ Game ended");
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
        console.log("🟡 Game status poll:", data);

        if (!data.isActive) {
          console.log("🟢 Game is inactive now.");
          setIsStarting(false);
          setGameStarted(false);
        } else {
          setIsStarting(true);
          setGameStarted(true);
        }
      } catch (error) {
        console.error("❌ Status polling failed:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [gameId]);

  // 🟢 UPDATED: Join Game & Emit to Socket - FIXED VERSION
  const startGame = async () => {
    console.log("🚀 ========== START GAME FUNCTION CALLED ==========");
    console.log("🟡 Step 0: Initial checks");
    console.log("   - isStarting:", isStarting);
    console.log("   - cartelaId:", cartelaId);
    console.log("   - telegramId:", telegramId);
    console.log("   - gameId:", gameId);
    
    if (isStarting) {
      console.log("❌ Already starting, returning early");
      return;
    }

    // Validation checks
    if (!cartelaId) {
      console.log("❌ No card selected!");
      setAlertMessage("❌ Please select a bingo card first!");
      return;
    }

    if (!telegramId || !gameId) {
      console.log("❌ Missing IDs - telegramId:", telegramId, "gameId:", gameId);
      setAlertMessage("❌ Missing user or game information");
      return;
    }

    setIsStarting(true);
    setAlertMessage("");

    try {
      console.log("🟢 Step 1: Starting game with request data:", {
        gameId,
        telegramId,
        cardId: cartelaId
      });

      const requestBody = {
        gameId: gameId,
        telegramId: telegramId,
        cardId: cartelaId
      };

      console.log("🟢 Step 2: Making API call to /api/games/start");
      console.log("   - URL: https://bingo-backend-8929.onrender.com/api/games/start");
      console.log("   - Method: POST");
      console.log("   - Body:", JSON.stringify(requestBody));

      const response = await fetch("https://bingo-backend-8929.onrender.com/api/games/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("🟢 Step 3: API Response received");
      console.log("   - Response status:", response.status);
      console.log("   - Response ok:", response.ok);

      const data = await response.json();
      console.log("🟢 Step 4: Parsed response data:", data);

      if (response.ok && data.success) {
        console.log("✅ SUCCESS: Game started successfully!");
        const { GameSessionId: currentSessionId } = data;
        console.log("   - GameSessionId:", currentSessionId);

        console.log("🟢 Step 5: Emitting joinGame to socket");
        socket.emit("joinGame", {
          gameId,
          telegramId,
          GameSessionId: currentSessionId
        });

        console.log("🟢 Step 6: Navigating to /game");
        navigate("/game", {
          state: {
            gameId,
            telegramId,
            GameSessionId: currentSessionId,
            cartelaId,
            cartela,
            playerCount: 1,
          },
        });
      } else if (data.message && data.message.includes("already running") && data.GameSessionId) {
        // 🟡 SPECIAL CASE: Game is already running, join it instead
        console.log("🟡 Game is already running - joining existing game");
        console.log("   - GameSessionId:", data.GameSessionId);
        
        console.log("🟢 Step 5: Emitting joinGame to socket for existing game");
        socket.emit("joinGame", {
          gameId,
          telegramId,
          GameSessionId: data.GameSessionId
        });

        console.log("🟢 Step 6: Navigating to /game to join existing game");
        navigate("/game", {
          state: {
            gameId,
            telegramId,
            GameSessionId: data.GameSessionId,
            cartelaId,
            cartela,
            playerCount: 1,
            isJoiningExisting: true
          },
        });
      } else {
        console.error("❌ FAILED: Game start API returned error");
        console.error("   - Error message:", data.message || data.error);
        console.error("   - Full response:", data);
        setAlertMessage(data.message || data.error || "Error starting the game");
      }
    } catch (error) {
      console.error("❌ CATCH BLOCK: Game start failed with exception");
      console.error("   - Error name:", error.name);
      console.error("   - Error message:", error.message);
      console.error("   - Error stack:", error.stack);
      
      if (error.message.includes("Failed to fetch")) {
        setAlertMessage("🌐 Network error: Cannot connect to server. Check your internet connection.");
      } else {
        setAlertMessage(`❌ Connection error: ${error.message}`);
      }
    } finally {
      console.log("🟢 Step 7: Finally block - resetting isStarting");
      setIsStarting(false);
    }
    
    console.log("🚀 ========== START GAME FUNCTION COMPLETED ==========");
  };

  console.log("🔵 Bingo Component Render - Current State:", {
    cartelaId,
    cartelaLength: cartela.length,
    userBalance,
    bonusBalance,
    gameStarted,
    isStarting,
    alertMessage
  });

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

          {/* Game Count Card */}
          <div className="flex flex-col justify-center items-center bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-400 max-h-[24vh] shadow-lg rounded-2xl transition-transform transform hover:scale-105">
            {gameStarted ? (
              <button className="flex flex-col justify-center items-center text-white font-extrabold text-lg sm:text-xl transition-transform transform hover:scale-105">
                <span className="animate-bounce">Wait 🛑</span>
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
              ([id, card]) => Number(card) === num && id !== telegramId
            );

            return (
              <button
                key={num}
                onClick={() => handleNumberClick(num)}
                disabled={isOtherCard}
                className={`w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 font-bold cursor-pointer transition-all duration-200 text-xs
                           ${isMyCard ? myCardBg : isOtherCard ? otherCardBg : defaultCardBg}`}
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
            <button onClick={resetGame} className={`${refreshBtnBg} text-white px-3 py-1 rounded-lg shadow-md text-sm`}>
              Refresh
            </button>
            <button
              onClick={startGame}
              disabled={!cartelaId || isStarting}
              className={`${
                !cartelaId || isStarting ? startBtnDisabledBg : startBtnEnabledBg
              } text-white px-3 py-1 rounded-lg shadow-md text-sm`}
            >
              {isStarting ? "Starting..." : "Start Game"}
            </button>
          </div>
        </div>
        
        {/* Debug Info Panel */}
        <div className="mt-4 p-2 bg-black/50 rounded-lg text-xs max-w-lg w-full">
          <div className="font-bold mb-1">Debug Info:</div>
          <div>cartelaId: {cartelaId || "null"}</div>
          <div>telegramId: {telegramId || "null"}</div>
          <div>gameId: {gameId || "null"}</div>
          <div>cartela length: {cartela.length}</div>
          <div>isStarting: {isStarting ? "true" : "false"}</div>
        </div>
      </div>
    </>
  );
}

export default Bingo;