import bingoCards from "../assets/bingoCards.json"; // Import the JSON file
import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";


// Initialize socket connection
const socket = io("https://bingobot-backend-bwdo.onrender.com");

function Bingo({isBlackToggleOn}) {
///////saving teh tegram id and gamechoice in localstaoge /////////////////////////////////////////////////////
 const [searchParams] = useSearchParams();
const urlTelegramId = searchParams.get("user");
const urlGameId = searchParams.get("game");
const location = useLocation();
const emitLockRef = useRef(false); // prevents double emit


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


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Existing effect to load saved card on mount
useEffect(() => {
  const savedId = sessionStorage.getItem("mySelectedCardId");
  if (savedId) {
    const selectedCard = bingoCards.find(card => card.id === Number(savedId));
    if (selectedCard) {
      setCartelaId(Number(savedId));
      setCartela(selectedCard.card);
    }
  }
}, []);


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const navigate = useNavigate();
  const [cartelaId, setCartelaId] = useState(null);
  const [cartela, setCartela] = useState([]);
  const [gameStatus, setGameStatus] = useState("");
  const [userBalance, setUserBalance] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
  const [response, setResponse] = useState("");
  const [otherSelectedCards, setOtherSelectedCards] = useState({});
  const [count, setCount] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSocketReady, setIsSocketReady] = useState(false);
   const hasInitialSyncRun = useRef(false);

  
const bgGradient = isBlackToggleOn
  ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
  : 'bg-purple-400';

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
    try {
      const res = await fetch(`https://bingobot-backend-bwdo.onrender.com/api/users/getUser?telegramId=${telegramId}`);
      if (!res.ok) throw new Error("User not found");
      const data = await res.json();
      setUserBalance(data.balance);
    } catch (err) {
      console.error(err);
      setAlertMessage("Error fetching user data.");
    }
  };

  // 🟢 Initial Effect to Fetch & Setup Socket
 useEffect(() => {
        if (!telegramId || !gameId) {
            console.error("Missing telegramId or gameId for game page.");
            navigate('/');
            return;
        }

        localStorage.setItem("telegramId", telegramId);

        // --- Define Socket Handlers (memoized or stable references are good practice) ---
        // These handlers depend on state setters, so they are generally recreated on each render
        // unless you useCallback them. For a useEffect that runs once for setup, it's often fine.
        const handleCardSelections = (cards) => {
            console.log("💡 Initial card selections received:", cards);
            const reformatted = {};
            // Object.entries returns [key, value]. Here, key is cardId (string), value is telegramId (string)
            for (const [cardId, tId] of Object.entries(cards)) {
                reformatted[tId] = parseInt(cardId); // Store as { telegramId: cardId }
            }
            setOtherSelectedCards(reformatted);
        };

        const handleCardReleased = ({ telegramId: releasedTelegramId, cardId }) => {
            console.log(`💡 Card ${cardId} released by ${releasedTelegramId}`);
            setOtherSelectedCards((prev) => {
                const newState = { ...prev };
                // Ensure we delete only if the released card matches the one currently held by that user
                if (newState[releasedTelegramId] === cardId) {
                    delete newState[releasedTelegramId];
                }
                return newState;
            });
        };

        // This function encapsulates the initial sync logic.
        const performInitialGameSync = () => {
            console.log("Attempting initial game sync...");
            if (socket.connected && telegramId && gameId) {
                // Ensure this only runs once per unique telegramId/gameId session
                const currentSyncKey = `${telegramId}-${gameId}`;
                if (hasInitialSyncRun.current === currentSyncKey) {
                    console.log("Initial sync already performed for this session.");
                    return; // Avoid duplicate emissions
                }

                console.log("Emitting userJoinedGame and re-emitting saved card...");
                socket.emit("userJoinedGame", { telegramId, gameId });

                const mySavedCardId = sessionStorage.getItem("mySelectedCardId");
                const mySavedCard = bingoCards.find(card => card.id === Number(mySavedCardId));
                if (mySavedCard) {
                    socket.emit("cardSelected", {
                        telegramId,
                        gameId,
                        cardId: Number(mySavedCardId),
                        card: mySavedCard.card,
                    });
                }
                // Emit joinUser if it's still necessary and separate from userJoinedGame
                socket.emit("joinUser", { telegramId }); // Consider if this is redundant with userJoinedGame

                hasInitialSyncRun.current = currentSyncKey; // Mark sync as done for this session
            } else {
                console.log("Socket not connected or missing data, deferring initial sync.");
            }
        };

        // --- Register Socket Listeners ---
        // Register these once when the component mounts.
        // The 'connect' event listener should preferably be in SocketContext for global management.
        // If SocketContext handles autoConnect:true, then `socket.connected` check below will be important.
        // If SocketContext handles `autoConnect:false` and `socket.connect()` explicitly, then `onConnect` in context handles it.

        socket.on("userconnected", (res) => { setResponse(res.telegramId); });
        socket.on("balanceUpdated", (newBalance) => { setUserBalance(newBalance); });
        socket.on("gameStatusUpdate", (status) => { setGameStatus(status); });
        socket.on("currentCardSelections", handleCardSelections);
        socket.on("cardConfirmed", (data) => {
            console.log("DEBUG: Frontend received cardConfirmed data:", data);
            const confirmedCardId = Number(data.cardId);
            setCartelaId(confirmedCardId);
            setCartela(data.card);
            sessionStorage.setItem("mySelectedCardId", data.cardId);
            setGameStatus("Ready to Start");
        });
        socket.on("cardUnavailable", ({ cardId }) => {
            setAlertMessage(`🚫 Card ${cardId} is already taken by another player.`);
            setCartela([]);
            setCartelaId(null);
            sessionStorage.removeItem("mySelectedCardId");
        });
        socket.on("cardError", ({ message }) => {
            setAlertMessage(message || "Card selection failed.");
            setCartela([]);
            setCartelaId(null);
            sessionStorage.removeItem("mySelectedCardId");
        });
        socket.on("otherCardSelected", ({ telegramId: otherId, cardId }) => {
            setOtherSelectedCards((prev) => ({
                ...prev,
                [otherId]: cardId,
            }));
        });
        socket.on("cardReleased", handleCardReleased); // New listener for card release
        socket.on("gameid", (data) => { setCount(data.numberOfPlayers); });
        socket.on("error", (err) => {
            console.error(err);
            setAlertMessage(err.message);
        });
        socket.on("cardsReset", ({ gameId: resetGameId }) => {
            if (resetGameId === gameId) {
                setOtherSelectedCards({});
                setCartela([]);
                setCartelaId(null);
                sessionStorage.removeItem("mySelectedCardId");
                console.log("🔄 Cards have been reset for this game.");
                hasInitialSyncRun.current = false; // Allow re-sync on next mount if desired
            }
        });

        // --- Initial Sync Logic ---
        // Option A: If socket is already connected when component mounts
        performInitialGameSync();

        // Option B: If socket connects AFTER component mounts (e.g., first load or reconnect)
        // Add a listener for the 'connect' event *here* if you want *this component* to trigger
        // the initial sync specifically when its socket connects.
        // IMPORTANT: If your SocketContext already emits userJoinedGame on connect,
        // you might be duplicating. Choose one source of truth for userJoinedGame.
        // However, if the context only handles global connection status, then this is fine.
        const handleConnectForSync = () => {
             console.log("Component: Socket re-connected, performing initial sync.");
             performInitialGameSync();
        };
        socket.on("connect", handleConnectForSync);

        socket.on("disconnect", () => {
          console.log("🔴 Socket disconnected — resetting sync flag.");
          hasInitialSyncRun.current = false;
        });



        fetchUserData(telegramId); // Initial fetch of user data

        // --- Cleanup Function ---
        return () => {
            // Remove all specific listeners attached by this component
            socket.off("userconnected");
            socket.off("balanceUpdated");
            socket.off("gameStatusUpdate");
            socket.off("currentCardSelections", handleCardSelections);
            socket.off("cardConfirmed");
            socket.off("cardUnavailable");
            socket.off("cardError");
            socket.off("otherCardSelected");
            socket.off("cardReleased", handleCardReleased);
            socket.off("gameid");
            socket.off("error");
            socket.off("cardsReset");
            socket.off("connect", handleConnectForSync); // Clean up this specific listener
            // Reset the sync flag when the component unmounts
            hasInitialSyncRun.current = false;
        };
    }, [telegramId, gameId, bingoCards, navigate, socket]); // Dependencies: Add all external values used inside useEffect
                                                         // Omitted 'isConnected' from dependencies as 'socket.connected' is checked inside.
                                                         // Adding 'socket' ensures effect re-runs if the socket instance itself changes (unlikely with Context)

 // Add 'socket' to dependencies if it's from context // Added bingoCards to dependencies as it's used in handleConnect



useEffect(() => {
  const handleBeforeUnload = () => {
    const savedCardId = sessionStorage.getItem("mySelectedCardId");
    if (savedCardId && telegramId && gameId) {
      if (!window.location.pathname.includes("/game")) {
      socket.emit("unselectCardOnLeave", {
        gameId,
        telegramId,
        cardId: Number(savedCardId),
      });
      sessionStorage.removeItem("mySelectedCardId");
    }
  }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    // Component unmount cleanup
    const savedCardId = sessionStorage.getItem("mySelectedCardId");
    if (savedCardId && telegramId && gameId) {
      socket.emit("unselectCardOnLeave", {
        gameId,
        telegramId,
        cardId: Number(savedCardId),
      });
      sessionStorage.removeItem("mySelectedCardId");
    }

    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}, [telegramId, gameId, socket]);



useEffect(() => {
  if (!socket) return;

  const handleCardAvailable = ({ cardId }) => {
    console.log("♻️ Card available:", cardId);
    emitLockRef.current = false;

    setOtherSelectedCards((prevCards) => {
      const updated = { ...prevCards };
      const keyToRemove = Object.keys(updated).find(
        (key) =>
          updated[key] === cardId || 
          String(updated[key]) === String(cardId)
      );

      if (keyToRemove) {
        delete updated[keyToRemove];
        console.log(`✅ Removed card ${cardId} from ${keyToRemove}`);
      } else {
        console.log("⚠️ Card not found in otherSelectedCards:", cardId);
      }

      return updated;
    });
  };

  socket.on("cardAvailable", handleCardAvailable);

  return () => {
    socket.off("cardAvailable", handleCardAvailable);
  };
}, [socket]);



  // 🟢 Select a bingo card
 const handleNumberClick = (number) => {
   console.log("Clicked button ID:", number);
   if (emitLockRef.current && number === cartelaId) return; // prevent double click on same card
  if (emitLockRef.current && number !== cartelaId) {
    // Allow changing the card - unlock first so the emit can happen
    emitLockRef.current = false;
  }

  // if (!isSocketReady) {
  //   console.warn("Socket not ready. Please wait...");
  //   return;
  // }

  const selectedCard = bingoCards.find(card => card.id === number);

   emitLockRef.current = true; // ✅ LOCK IMMEDIATELY

  if (selectedCard) {
    setCartela(selectedCard.card);
    setCartelaId(number);
    setGameStatus("Ready to Start");

    sessionStorage.setItem("mySelectedCardId", number);

    socket.emit("cardSelected", {
      telegramId,
      gameId,
      cardId: number,
      card: selectedCard.card,
    });
  } else {
    console.error("Card not found for ID:", number);
  }
};


useEffect(() => {

  // Game start handler
  socket.on("gameStart", () => {
    setGameStarted(true);
  });

  return () => {
    socket.off("gameStart");
  };
}, []);

useEffect(() => {

  // Game start handler
  socket.on("gameFinished", () => {
    setGameStarted(false);
  });

  return () => {
    socket.off("gameFinished");
  };
}, []);


  const resetGame = () => {
    const savedCardId = sessionStorage.getItem("mySelectedCardId");
    emitLockRef.current = false; 
     fetchUserData(telegramId);
     socket.emit("unselectCardOnLeave", {
        gameId,
        telegramId,
        cardId: Number(savedCardId),
      });
    console.log("emiting the unselectCardOnLeave");
    setCartelaId(null);
    setCartela([]);
    setGameStatus("");
  };


  // Real-time update
useEffect(() => {
  socket.on("gameEnded", () => {
    setGameStarted(false);
    setAlertMessage("");
     sessionStorage.removeItem("mySelectedCardId")
  });

  return () => socket.off("gameEnded");
}, []);

 useEffect(() => {
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`https://bingobot-backend-bwdo.onrender.com/api/games/${gameId}/status`);
      const data = await res.json();

      if (!data.isActive) {
        console.log("🟢 Game is inactive now.");
        setIsStarting(false);
        setGameStarted(false);  // ✅ Ensure gameStarted is false if game is not active
      } else {
        setIsStarting(true);
        setGameStarted(true);   // ✅ If active, keep this in sync
      }
    } catch (error) {
      console.error("Status polling failed:", error);
    }
  }, 3000);

  return () => clearInterval(interval);
}, [gameId]);


useEffect(() => {
  if (location.pathname === "/game") {
    setIsStarting(false); // Reset only after page switches
  }
}, [location.pathname]);


  // 🟢 Join Game & Emit to Socket
const startGame = async () => {
  if (isStarting) return;

  setIsStarting(true); // Block double-clicking

  try {
    // 🧠 Step 1: Check if a game is already running
    const statusRes = await fetch(`https://bingobot-backend-bwdo.onrender.com/api/games/${gameId}/status`);
    const statusData = await statusRes.json();

    if (statusData.exists && statusData.isActive) {
      alert("🚫 A game is already running or being initialized. Please wait.");
      setIsStarting(false);
      return;
    }

    // 🟢 Step 2: Start game - backend checks player balance and game state
    const response = await fetch("https://bingobot-backend-bwdo.onrender.com/api/games/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId, telegramId }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // ✅ Step 3: Game is ready, join the socket room now
      socket.emit("joinGame", { gameId, telegramId });

      // ✅ Step 4: Listen for player count updates
      socket.off("playerCountUpdate").on("playerCountUpdate", ({ playerCount }) => {
        console.log(`Players in the game room ${gameId}: ${playerCount}`);
        setPlayerCount(playerCount);
      });

      // ✅ Step 5: Listen for gameId confirmation and navigate
      socket.off("gameId").on("gameId", (res) => {
        const { gameId: receivedGameId, telegramId: receivedTelegramId } = res;

        if (receivedGameId && receivedTelegramId) {
          navigate("/game", {
            state: {
              gameId: receivedGameId,
              telegramId: receivedTelegramId,
              cartelaId,
              cartela,
              playerCount,
            },
          });
        } else {
          setAlertMessage("Invalid game or user data received!");
        }
      });

    } else {
      // 🚨 Backend rejected the request
      setAlertMessage(data.error || "Error starting the game");
      console.error("Game start error:", data.error);
    }

  } catch (error) {
    setAlertMessage("Error connecting to the backend");
    console.error("Connection error:", error);
  } 
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
    

  <div className="flex justify-around w-full max-w-lg mb-2">
    <div className={`${cardBg} ${cardText} px-10 py-1 rounded-3xl text-center font-bold text-sm`}>
      Balance<br />
      <span className="font-bold">{userBalance !== null ? `${userBalance} Birr` : "Loading..."}</span>
    </div>
    <div className={`${cardBg} ${cardText} px-3 py-1 rounded-3xl text-center font-bold text-sm`}>
      Game <br />
      <span className="font-bold">{count}</span>
    </div>
    <div className={`${cardBg} ${cardText} px-10 py-1 rounded-3xl text-center text-sm font-bold`}>
      Game Choice<br />
      <span className="font-bold">{gameId} </span>
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
          disabled={isOtherCard} // 🚫 Disable until socket is ready or card is taken
          className={`w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 font-bold cursor-pointer transition-all duration-200 text-xs
            ${isMyCard ? myCardBg : isOtherCard ? otherCardBg : defaultCardBg}`}
        >
          {num}
        </button>
      );
    })}
  </div>

  {cartela.length > 0 && (
    <div className="grid grid-cols-5 gap-1 p-2 bg-transparent text-white">
      {cartela.flat().map((num, index) => (
        <div key={index} className={`w-10 h-10 flex items-center justify-center border border-white rounded-lg text-xs font-bold ${cellBg}`}>
          {num}
        </div>
      ))}
    </div>
  )}

  <div className="flex gap-2 mt-3">
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


    </>

  );
};

export default Bingo;
