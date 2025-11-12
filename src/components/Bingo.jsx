import bingoCards from "../assets/bingoCards.json";
import { useEffect, useState, useRef, useMemo } from "react"; // Added useMemo
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocation } from "react-router-dom";


// Initialize socket connection
//const socket = io("https://bingobot-backend-bwdo.onrender.com");

// Updated props: cartelaId is now cartelaIds (array)
function Bingo({isBlackToggleOn, setCartelaIdInParent, cartelaIds, socket, otherSelectedCards, setOtherSelectedCards, emitLockRef }) {
///////saving teh tegram id and gamechoice in localstaoge /////////////////////////////////////////////////////
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


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const navigate = useNavigate();
// cartela will now be an array of card objects or data for rendering
// The state should hold the actual card data for *all* selected cards
const [selectedCartelas, setSelectedCartelas] = useState([]);
const [gameStatus, setGameStatus] = useState(false);
const [userBalance, setUserBalance] = useState(null);
const [bonusBalance, setUserBonusBalance] = useState(null);
const [alertMessage, setAlertMessage] = useState("");
const [response, setResponse] = useState("");
const [count, setCount] = useState(0);
const [playerCount, setPlayerCount] = useState(0);
const [gameStarted, setGameStarted] = useState(false);
const [countdown, setCountdown] = useState(0);
const [isStarting, setIsStarting] = useState(false);
const hasInitialSyncRun = useRef(false);
const lastRequestIdRef = useRef(0); 

// 🆕 NEW STATE FOR PAGINATION
const [currentPage, setCurrentPage] = useState(1);
const CARDS_PER_PAGE = 100;
const MAX_CARDS_ALLOWED = 2; // Maximum cards a user can select

// Calculate the range of card IDs for the current page
const startCardId = (currentPage - 1) * CARDS_PER_PAGE + 1;
const endCardId = currentPage * CARDS_PER_PAGE;
const pageNumbers = Array.from({ length: CARDS_PER_PAGE }, (_, i) => startCardId + i);
// Filter bingoCards for the current page to ensure we only render available buttons
const cardsForCurrentPage = useMemo(() => {
    return bingoCards.filter(card => card.id >= startCardId && card.id <= endCardId);
}, [startCardId, endCardId, bingoCards]); // <-- RECOMMENDED FIX: Added bingoCards to dependency array


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
// ... (fetchUserData remains the same)
try {
const res = await fetch(`https://api.bingoogame.com/api/users/getUser?telegramId=${telegramId}`);
if (!res.ok) throw new Error("User not found");
const data = await res.json();
setUserBalance(data.balance);
setUserBonusBalance(data.bonus_balance);
} catch (err) {
console.error(err);
setAlertMessage("Error fetching user data.");
}
};

// Helper function to restore card data from cartelaIds array
const restoreSelectedCartelas = (cardIds) => {
    const cards = cardIds
        .map(id => bingoCards.find(card => card.id === Number(id)))
        .filter(card => card); // Filter out null/undefined if ID is not found
    
    setSelectedCartelas(cards);
};

// 🟢 Initial Effect to Fetch & Setup Socket
useEffect(() => {
console.log("🟢 initial Effect")
if (!telegramId || !gameId) {
console.error("Missing telegramId or gameId for game page.");
navigate('/');
return;
}

// 🆕 MODIFIED: Now handles an array of card IDs for restoration
const handleCardSelections = (cards) => {
  console.log("💡 Initial card selections received:", cards);
  const reformatted = {};
  const myCardIds = []; // Array to store user's own selected card IDs

   if (lastRequestIdRef.current > 0) {
    console.log("⚠ Skipping selections update due to pending request");
    return;
  }
  
  for (const [cardId, tId] of Object.entries(cards)) {
    if (tId === telegramId) {
      myCardIds.push(parseInt(cardId)); // Collect all of user's cards
    } else {
      reformatted[tId] = parseInt(cardId);     // Store other players' selections
    }
  }

  // Restore user's own cards
  setCartelaIdInParent(myCardIds); // 👈 Restore your own card selection (Array)
  restoreSelectedCartelas(myCardIds); // Restore card data for rendering
  console.log("🍔🍔🍔 my card(s) set:", myCardIds);


  setOtherSelectedCards(reformatted); // 👈 Only others
};


const handleCardReleased = ({ telegramId: releasedTelegramId, cardId }) => {
console.log(`💡 Card ${cardId} released by ${releasedTelegramId}`);
setOtherSelectedCards((prev) => {
const newState = { ...prev };
// The logic here remains tricky since 'otherSelectedCards' only stores ONE card per user
// For multi-card support for others, this state needs to become an object mapping tId to an array of cardIds: { tId: [cardId1, cardId2] }
// For now, we assume backend handles 'otherSelectedCards' as a flat map of (cardId: tId) for simplicity in this frontend update.
// If the goal is only to support 2 cards for *THIS* user, we can keep 'otherSelectedCards' as is (cardId: tId).
// Let's assume the backend will communicate *all* taken cards (cardId: tId)
if (newState[releasedTelegramId] === cardId) { // This line is for the original flat structure
delete newState[releasedTelegramId];
}
return newState;
});
};

// 🆕 MODIFIED: To handle multiple card IDs from sessionStorage and for new 'otherSelectedCards' structure
const handleInitialCardStates = (data) => {
    console.log("💡 Frontend: Received initialCardStates (full board sync):", data);
    const { takenCards } = data; // Backend sends: { "cardId": { cardId: N, takenBy: 'TID', isTaken: true } }

    if (lastRequestIdRef.current > 0) {
      console.log("⚠ Skipping initial restore because a newer request is pending.");
      return;
    }

    const newOtherSelectedCardsMap = {};
    const myRestoredCardIds = [];

    for (const cardId in takenCards) {
        const takenByTelegramId = takenCards[cardId].takenBy;
        if (takenByTelegramId === telegramId) {
             myRestoredCardIds.push(Number(cardId)); // Collect your own cards from the sync
        } else {
            // This is for other users. Assuming otherSelectedCards will still be a flat map (cardId: tId) for simplicity
            newOtherSelectedCardsMap[takenByTelegramId] = Number(cardId); 
            // NOTE: For full multi-card support, this structure should change to { tId: [cardId1, cardId2] }
        }
    }
    setOtherSelectedCards(newOtherSelectedCardsMap); // Set the full map for others

    // --- Restore User's Own Card(s) ---
    // Try to restore from session storage first. Assuming session storage stores a comma-separated string for multiple cards.
    const mySavedCardIdsString = sessionStorage.getItem("mySelectedCardIds"); // Changed key
    let savedIds = [];
    if (mySavedCardIdsString) {
        savedIds = mySavedCardIdsString.split(',').map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
    }

    // Combine and deduplicate saved IDs and sync IDs
    const finalMyCardIds = Array.from(new Set([...savedIds, ...myRestoredCardIds]));

    if (finalMyCardIds.length > 0) {
        restoreSelectedCartelas(finalMyCardIds);
        setCartelaIdInParent(finalMyCardIds);
        sessionStorage.setItem("mySelectedCardIds", finalMyCardIds.join(',')); // Update storage with confirmed list
    } else {
        // If no saved/synced card, ensure UI and parent state are clear
        setSelectedCartelas([]);
        setCartelaIdInParent([]);
        sessionStorage.removeItem("mySelectedCardIds");
    }
    // --- End Restore User's Own Card ---

    hasInitialSyncRun.current = true; // Mark sync as done for this specific mount
};

// This function encapsulates the initial sync logic. (Remains mostly the same)
const performInitialGameSync = () => {
  
if (socket.connected && telegramId && gameId) {
const currentSyncKey = `${telegramId}-${gameId}`;
if (hasInitialSyncRun.current === currentSyncKey) {
return; 
}

 console.log(`Frontend: Emitting 'userJoinedGame' for gameId: ${gameId}`);
socket.emit("userJoinedGame", { telegramId, gameId });
 console.log("sending emit [userJoinedGame]");
console.log("sending emit")
}
};


socket.on("initialCardStates", handleInitialCardStates);
socket.on("userconnected", (res) => { setResponse(res.telegramId); });
socket.on("balanceUpdated", (newBalance) => { setUserBalance(newBalance); });
socket.on("gameStatusUpdate", (status) => { 
  setGameStatus(status);
    console.log("the game status",status);
 });
socket.on("currentCardSelections", handleCardSelections); // Uses the new handler

// 🆕 MODIFIED: To handle confirmation of multiple cards
socket.on("cardConfirmed", (data) => {
  console.log("DEBUG: Frontend received cardConfirmed data:", data);

  // Ignore stale confirmations
  if (data.requestId !== lastRequestIdRef.current) {
    console.warn(`Ignoring stale confirmation. Current: ${lastRequestIdRef.current}, Received: ${data.requestId}`);
    return;
  }
  
  // Assuming the backend sends back the *full, updated* array of card IDs held by the user
  const confirmedCardIds = Array.isArray(data.cardIds) ? data.cardIds.map(Number) : [Number(data.cardId)].filter(id => !isNaN(id));
  
  // Update state with the confirmed list
  setCartelaIdInParent(confirmedCardIds);
  restoreSelectedCartelas(confirmedCardIds); // Update local card data
  sessionStorage.setItem("mySelectedCardIds", confirmedCardIds.join(',')); // Update session storage (changed key)
  setGameStatus("Ready to Start");

   // ✅ Safe to allow new requests now
  lastRequestIdRef.current = 0;
  emitLockRef.current = false; // Release the general click lock
});

// 🆕 MODIFIED: Card Unavailable / Error Handling for multi-card
socket.on("cardUnavailable", ({ cardId, currentHeldCardIds }) => {
setAlertMessage(`🚫 Card ${cardId} is already taken by another player.`);
// Assuming backend sends back the list of cards still held by the user after the failed attempt
// ✅ FIX: Ensure cartelaIds prop is an array before defaulting to it
const updatedCardIds = currentHeldCardIds || (Array.isArray(cartelaIds) ? cartelaIds : []);
setCartelaIdInParent(updatedCardIds);
restoreSelectedCartelas(updatedCardIds);
sessionStorage.setItem("mySelectedCardIds", updatedCardIds.join(','));
lastRequestIdRef.current = 0;
emitLockRef.current = false;
});

socket.on("cardError", ({ message, currentHeldCardIds }) => {
    setAlertMessage(message || "Card selection failed.");
    // Assuming backend sends back the list of cards still held by the user after the failed attempt
    // ✅ FIX: Ensure cartelaIds prop is an array before defaulting to it
    const updatedCardIds = currentHeldCardIds || (Array.isArray(cartelaIds) ? cartelaIds : []);
    setCartelaIdInParent(updatedCardIds);
    restoreSelectedCartelas(updatedCardIds);
    sessionStorage.setItem("mySelectedCardIds", updatedCardIds.join(','));
    lastRequestIdRef.current = 0;
    emitLockRef.current = false;
});


socket.on("cardReleased", handleCardReleased);
socket.on("gameid", (data) => { setCount(data.numberOfPlayers); 
  console.log("number of players recived", data.numberOfPlayers);
});
socket.on("error", (err) => {
console.error(err);
setAlertMessage(err.message);
});
socket.on("cardsReset", ({ gameId: resetGameId }) => {
if (resetGameId === gameId) {
setOtherSelectedCards({});
setSelectedCartelas([]); // Clear local card data
setCartelaIdInParent([]); // Clear parent state (Array)
sessionStorage.removeItem("mySelectedCardIds"); // Changed key
// console.log("🔄 Cards have been reset for this game.");
hasInitialSyncRun.current = false; 
}
});

// --- Initial Sync Logic ---
performInitialGameSync();
const handleConnectForSync = () => {
    if (!hasInitialSyncRun.current) {
        console.log("Component: Socket re-connected/connected, performing initial sync.");
        performInitialGameSync();
    }
};

const handleCountdownTick = ({ countdown }) => setCountdown(countdown);

socket.on("connect", handleConnectForSync);
socket.on("countdownTick", handleCountdownTick);

socket.on("disconnect", () => {
hasInitialSyncRun.current = false;
});


fetchUserData(telegramId); // Initial fetch of user data

// --- Cleanup Function ---
return () => {
// ... (Cleanup remains mostly the same, ensuring correct listeners are used)
socket.off("countdownTick", handleCountdownTick);
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
}, [telegramId, gameId, navigate, socket, setCartelaIdInParent, setOtherSelectedCards, otherSelectedCards, cartelaIds]); // Added cartelaIds to dependency array for cardError/cardUnavailable


// 🟢 Select/Deselect a bingo card
const handleNumberClick = (number) => {
  console.log("Clicked button ID:", number);
  
  if (emitLockRef.current) {
      console.log("Click locked. Waiting for server confirmation.");
      return;
  }

  // ✅ FIX: Add guard clause to ensure cartelaIds is a valid array
  if (!Array.isArray(cartelaIds)) {
    console.warn("cartelaIds is not an array, preventing click.");
    return;
  }

  const isSelected = cartelaIds.includes(number); // Now safe
  let newSelectedIds;

  if (isSelected) {
    // DESELECT
    newSelectedIds = cartelaIds.filter(id => id !== number); // Now safe
  } else {
    // SELECT
    if (cartelaIds.length >= MAX_CARDS_ALLOWED) { // Now safe
      setAlertMessage(`🚫 You can only select up to ${MAX_CARDS_ALLOWED} cards.`);
      setTimeout(() => setAlertMessage(""), 3000);
      return;
    }
    newSelectedIds = [...cartelaIds, number]; // Now safe
  }
  
  // Find the actual card data for the newly selected set (for optimistic UI update)
  const newSelectedCardsData = newSelectedIds.map(id => bingoCards.find(card => card.id === id)).filter(Boolean);

  // Increment requestId and set lock
  lastRequestIdRef.current += 1;
  const requestId = lastRequestIdRef.current;
  emitLockRef.current = true; 

  // Optimistic UI update
  setCartelaIdInParent(newSelectedIds);
  setSelectedCartelas(newSelectedCardsData);
  setGameStatus("Ready to Start");
  
  const cardsDataMap = newSelectedCardsData.reduce((acc, card) => {
        // Find the card layout from the imported bingoCards.json
        const cardLayout = bingoCards.find(c => c.id === card.id)?.card;
        if (cardLayout) {
          acc[card.id] = cardLayout; // cardLayout is the [[Number]] array
        }
        return acc;
    }, {});

    // Send request to backend with new array of card IDs AND the data map
    socket.emit("cardSelected", {
      telegramId,
      gameId,
      cardIds: newSelectedIds,   // The array of IDs [10, 25]
      cardsData: cardsDataMap, // 🆕 The map of { 10: [...], 25: [...] }
      requestId
    });
    console.log(`Card(s) emitted to backend: ${newSelectedIds} with requestId: ${requestId}`);
  };


useEffect(() => {
// Game start handler
socket.on("gameStart", () => {
setGameStarted(true);
});

// Game finished handler
socket.on("gameFinished", () => {
setGameStarted(false);
});

// Game end handler
socket.on("gameEnded", () => {
console.log("gameended ⬅️⬅️⬅️")
setGameStarted(false);
setIsStarting(false);
setAlertMessage("");
sessionStorage.removeItem("mySelectedCardIds") // Changed key
});

socket.on("gameEnd", () => {
console.log("gameEnd ⬅️⬅️⬅️")
setGameStarted(false);
setIsStarting(false);
setAlertMessage("");
sessionStorage.removeItem("mySelectedCardIds") // Changed key
});

return () => {
socket.off("gameStart");
socket.off("gameFinished");
socket.off("gameEnded");
socket.off("gameEnd");
};
}, [socket]); // Added socket to dependency array


const resetGame = () => {
 window.location.reload();
 console.log("page refreshed")
};


// 🟢 Start Game & Emit to Socket
const startGame = async () => {
    // ✅ FIX: Check if cartelaIds is a valid array and is not empty
    if (isStarting || !Array.isArray(cartelaIds) || cartelaIds.length === 0) return;

    setIsStarting(true); // Block double-clicking

    try {
        // Step 1: Start game fetch call remains the same, but send all card IDs
        const response = await fetch("https://api.bingoogame.com/api/games/start", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ gameId, telegramId, cardIds: cartelaIds }), // 🆕 Sending cardIds array
        });

        const data = await response.json();

        if (response.ok && data.success) {
            const { GameSessionId: currentSessionId } = data;

            // Step 2: Game is ready, join the socket room.
            socket.emit("joinGame", {
                gameId,
                telegramId,
                GameSessionId: currentSessionId,
                userHeldCardIds: cartelaIds, // 🆕 Sending cardIds array
            });

            // Step 3: Immediately navigate to the game page.
            navigate("/game", {
                state: {
                    gameId,
                    telegramId,
                    GameSessionId: currentSessionId,
                    cartelaIds, // 🆕 Sending cardIds array
                    selectedCartelas, // Pass the card data
                    playerCount: 1, 
                },
            });

        } else if (response.status === 400 && data.GameSessionId) {
            setAlertMessage(data.message || "🚫 A game is already running. Please wait!!!");
            console.warn("Attempt to start active game:", data);
             setGameStarted(true);
        } else {
            // Generic backend or validation error
            setAlertMessage(data.error || "Error joining the game lobby.");
            console.error("Game start error:", data.error);
        }

    } catch (error) {
        setAlertMessage("Error connecting to the backend");
        console.error("Connection error:", error);
    } finally {
        setIsStarting(false);
        // Ensure setAlertMessage is defined before calling it
        if (typeof setAlertMessage === 'function') {
            setTimeout(() => setAlertMessage(""), 4000);
        }
    }
};


return (
<>
<div className={`flex flex-col items-center p-3 pb-20 min-h-screen ${bgGradient} text-white w-full overflow-hidden`}>
{/* ... (Alert Message UI remains the same) ... */}
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


  <div className="flex flex-row flex-wrap justify-center gap-2 w-full max-w-xl text-white text-center mb-2">
  
  {/* Balance Cards (remain the same) */}
  <div className="flex flex-col justify-center w-1/5 bg-[#3D74B6] max-h-[24vh] rounded-2xl shadow-lg transition-transform transform hover:scale-105">
    <p className="text-sm sm:text-base font-semibold tracking-wide opacity-90">
      Balance
    </p>
    <span className="text-md sm:text-md font-extrabold block">
      {userBalance !== null ? `${userBalance} ብር` : "Loading..."}
    </span>
  </div>

  <div className="flex flex-col justify-center w-1/5 bg-[#51B33B] max-h-[24vh] rounded-2xl shadow-lg transition-transform transform hover:scale-105">
    <p className="text-sm sm:text-base font-semibold tracking-wide opacity-90">
      Bonus
    </p>
    <span className="text-md sm:text-md font-extrabold block">
      {bonusBalance !== null ? `${bonusBalance} ብር` : "Loading..."}
    </span>
  </div>

  <div className="flex flex-col justify-center w-1/5 items-center bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-400 max-h-[24vh] shadow-lg rounded-2xl transition-transform transform hover:scale-105">
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

  <div className="flex flex-col justify-center w-1/5 bg-[#FFD93D] max-h-[24vh] rounded-2xl shadow-lg transition-transform transform hover:scale-105">
    <p className="text-sm sm:text-base font-semibold tracking-wide opacity-90">
      ባለ
    </p>
    <span className="text-lg sm:text-xl font-extrabold block">
      {gameId}
    </span>
  </div>

  {/* Countdown Card (remains the same) */}
 <div className="flex items-center justify-between w-[85%] max-h-[5vh] bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl shadow-lg p-3 text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl">
  <p className="text-lg font-extrabold tracking-wider drop-shadow-md flex items-center gap-2">
    {gameStarted ? "🎯 Game Started!" : countdown > 0 ? `⏳ ${countdown}s` : "🎉 Join the Game"}
  </p>

  <div className="w-1/3 h-4 bg-white/30 rounded-full overflow-hidden ml-4">
    <div
      className={`h-full transition-all duration-500 ${
        gameStarted
          ? "bg-green-400 animate-pulse"
          : countdown > 0
          ? "bg-yellow-400 animate-[progress_1s_linear_infinite]"
          : "bg-blue-400"
      }`}
      style={{
        width:
          gameStarted || countdown <= 0
            ? "100%"
            : `${(10 - countdown) * 10}%`,
      }}
    ></div>
  </div>
</div>

  </div>


{/* 🆕 Card Selection Pagination */}
<div className="flex justify-center items-center gap-4 mb-2">
    <button 
        onClick={() => setCurrentPage(1)} 
        disabled={currentPage === 1}
        className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors duration-200 ${
            currentPage === 1 ? 'bg-gray-500 text-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
        }`}
    >
        Cards 1-100
    </button>
   <button 
        onClick={() => setCurrentPage(2)} 
        // No change needed here, bingoCards should be guaranteed to be loaded if the component mounts.
        disabled={currentPage === 2 || bingoCards.length < 101}
        className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors duration-200 ${
            currentPage === 2 ? 'bg-gray-500 text-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
        }`}
     >
        Cards 101-{Math.min(200, bingoCards.length)}
    </button>
    <span className="text-sm font-bold text-gray-300">
        {/* ✅ FIX: Defensive check for cartelaIds.length */}
        Selected: {Array.isArray(cartelaIds) ? cartelaIds.length : 0}/{MAX_CARDS_ALLOWED}
    </span>
</div>
{/* --- End Pagination --- */}


<div className="grid grid-cols-10 gap-1 py-1 px-2 max-w-lg w-full text-xs">
{cardsForCurrentPage.map((card) => {
 // Check if the current card ID is in the array of selected IDs
 
 // ✅ FIX: Defensive check for cartelaIds
 const isMyCard = Array.isArray(cartelaIds) && cartelaIds.includes(card.id); 
 
 // ✅ FIX: Defensive check for otherSelectedCards
 const isOtherCard = (otherSelectedCards && Object.entries(otherSelectedCards).some(
   ([id, otherCardId]) => Number(otherCardId) === card.id && id !== telegramId
 ));

return (
<button
  key={card.id}
  onClick={() => handleNumberClick(card.id)}
  
  // ✅ FIX: Defensive check for cartelaIds in disabled logic
  disabled={isOtherCard || (!Array.isArray(cartelaIds) || cartelaIds.length >= MAX_CARDS_ALLOWED) && !isMyCard} 
  
  className={`w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 font-bold cursor-pointer transition-all duration-200 text-xs
           ${isMyCard ? myCardBg : isOtherCard ? otherCardBg : defaultCardBg}`}
>
  {card.id}
</button>
);
})}
</div>

{/* 🆕 RENDER ALL SELECTED CARDS (Max 2) */}
<div className="flex gap-3 items-start mt-4 flex-wrap justify-center">
{selectedCartelas.map((cardData, cardIndex) => (
    <div key={cardIndex} className="flex flex-col items-center">
        <h4 className="text-sm font-semibold mb-1">Card #{cardData.id}</h4>
        <div className="grid grid-cols-5 gap-1 p-1 bg-transparent text-white border-2 border-green-500 rounded-lg">
            {cardData.card.flat().map((num, index) => (
                <div key={index} className={`w-6 h-6 flex items-center justify-center border border-white rounded-lg text-xs font-bold ${cellBg}`}>
                    {num}
                </div>
            ))}
        </div>
    </div>
))}

<div className="flex flex-col gap-2 mt-2 self-end">
    <button onClick={resetGame} className={`${refreshBtnBg} text-white px-3 py-1 rounded-lg shadow-md text-sm`}>
      Refresh
    </button>
    <button
     onClick={startGame}
     
     // ✅ FIX: Defensive check for cartelaIds array
     disabled={!Array.isArray(cartelaIds) || cartelaIds.length === 0 || isStarting} 
     className={`${
           // ✅ FIX: Defensive check for cartelaIds array
           !Array.isArray(cartelaIds) || cartelaIds.length === 0 || isStarting ? startBtnDisabledBg : startBtnEnabledBg
         } text-white px-3 py-1 rounded-lg shadow-md text-sm`}
    >
    {/* ✅ FIX: Defensive check for cartelaIds array in button text */}
    {isStarting ? "Starting..." : `Start Game (${Array.isArray(cartelaIds) ? cartelaIds.length : 0} Card${(Array.isArray(cartelaIds) && cartelaIds.length !== 1) ? 's' : ''})`}
    </button>
</div>
</div>
{/* --- End Selected Cards Rendering --- */}

</div>


</>

);
};

export default Bingo;