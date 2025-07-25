import bingoCards from "../assets/bingoCards.json";
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";

function Bingo({ isBlackToggleOn, setCartelaIdInParent, cartelaId, socket }) {
    // --- Existing LocalStorage and URL Search Params Logic ---
    const [searchParams] = useSearchParams();
    const urlTelegramId = searchParams.get("user");
    const urlGameId = searchParams.get("game");
    const location = useLocation();
    const emitLockRef = useRef(false); // Prevents rapid duplicate emits
    const prevPathRef = useRef(null); // Not used in this snippet, can be removed if truly unused

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

    const telegramId = urlTelegramId || localStorage.getItem("telegramId");
    const gameId = urlGameId || localStorage.getItem("gameChoice");

    // --- State Variables ---
    const navigate = useNavigate();
    const [cartela, setCartela] = useState([]); // This holds the 5x5 array for YOUR selected card
    const [gameStatus, setGameStatus] = useState("");
    const [userBalance, setUserBalance] = useState(null);
    const [alertMessage, setAlertMessage] = useState("");
    const numbers = Array.from({ length: 100 }, (_, i) => i + 1);

    // ⭐ CRITICAL: `allTakenCardsMap` will store { cardId: telegramId } for ALL taken cards on the board
    const [allTakenCardsMap, setAllTakenCardsMap] = useState({});

    const [playerCount, setPlayerCount] = useState(0);
    const [gameStarted, setGameStarted] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const hasInitialSyncRun = useRef(false); // Flag to ensure initial 'userJoinedGame' only runs once per mount

    // --- Styling Classes (KEEP AS IS) ---
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

    // --- Fetch User Balance from REST (KEEP AS IS) ---
    const fetchUserData = async (id) => {
        try {
            const res = await fetch(`https://bingobot-backend-bwdo.onrender.com/api/users/getUser?telegramId=${id}`);
            if (!res.ok) throw new Error("User not found");
            const data = await res.json();
            setUserBalance(data.balance);
        } catch (err) {
            console.error(err);
            setAlertMessage("Error fetching user data.");
        }
    };

    // --- Event Handlers using useCallback for memoization ---

    // ⭐ REVISED: `handleInitialCardStates` for `initialCardStates` event
    // This receives { cardId: { cardId: N, takenBy: 'TID', isTaken: true } }
    const handleInitialCardStates = useCallback((data) => {
        console.log("💡 Frontend: Received initialCardStates:", data);
        const { takenCards } = data; // 'takenCards' is the object containing card objects

        const newTakenCardsMap = {};
        for (const cardId in takenCards) {
            newTakenCardsMap[cardId] = takenCards[cardId].takenBy; // Map { cardId: telegramId }
        }
        setAllTakenCardsMap(newTakenCardsMap); // Set the entire map

        // If the current user has a card selected (cartelaId prop), ensure it's visually set
        if (cartelaId) {
            const selectedCardData = bingoCards.find(card => card.id === cartelaId);
            if (selectedCardData) {
                setCartela(selectedCardData.card);
            }
        }
        hasInitialSyncRun.current = true; // Mark sync as done for this session
    }, [telegramId, cartelaId]); // Dependency array: telegramId, cartelaId

    // ⭐ REVISED: `handleCardReleased` for `cardReleased` event
    // This receives { telegramId: releasedTelegramId, cardId }
    const handleCardReleased = useCallback(({ telegramId: releasedTelegramId, cardId }) => {
        console.log(`💡 Card ${cardId} released by ${releasedTelegramId}`);
        setAllTakenCardsMap((prev) => {
            const newState = { ...prev };
            // Ensure we remove only if the released card matches the one currently held by that user
            // Or if the card ID exists in the map and that user is the owner
            if (String(newState[cardId]) === String(releasedTelegramId)) {
                delete newState[cardId];
                console.log(`✅ Removed card ${cardId} from allTakenCardsMap by ${releasedTelegramId}`);
            } else {
                console.log(`⚠️ Card ${cardId} not found or owner mismatch in allTakenCardsMap for release by ${releasedTelegramId}. Current owner: ${newState[cardId]}`);
            }
            return newState;
        });
    }, []);

    // ⭐ REVISED: `handleCardAvailable` for `cardAvailable` event (when previous card by *current user* is released)
    // This receives { cardId }
    const handleCardAvailable = useCallback(({ cardId }) => {
        console.log("♻️ Card available:", cardId);
        emitLockRef.current = false; // Release the emit lock

        // Remove the card from the `allTakenCardsMap` if it exists
        setAllTakenCardsMap((prevCards) => {
            const updated = { ...prevCards };
            if (updated[cardId]) {
                delete updated[cardId];
                console.log(`✅ Removed available card ${cardId} from allTakenCardsMap.`);
            }
            return updated;
        });
    }, []);

    // This function encapsulates the initial sync logic.
    const performInitialGameSync = useCallback(() => {
        if (socket && socket.connected && telegramId && gameId && !hasInitialSyncRun.current) {
            console.log(`Frontend: Emitting 'userJoinedGame' for gameId: ${gameId}`);
            socket.emit("userJoinedGame", { telegramId, gameId });
            console.log("sending emit [userJoinedGame]");
            // `hasInitialSyncRun.current = true` is set inside `handleInitialCardStates`
            // because that's when we confirm the data has been received and processed.
        } else if (socket && !socket.connected) {
            console.log("Socket not connected, deferring initial sync.");
        } else if (hasInitialSyncRun.current) {
            console.log("Initial sync already performed for this session.");
        }
    }, [socket, telegramId, gameId]);

    // --- Main useEffect for Socket Listeners and Initial Setup ---
    useEffect(() => {
        console.log("🟢 initial Effect mount/update for socket listeners.");
        if (!telegramId || !gameId) {
            console.error("Missing telegramId or gameId for game page, navigating home.");
            navigate('/');
            return;
        }

        if (!socket) {
            console.warn("Socket object is null/undefined in useEffect, cannot set listeners.");
            return;
        }

        // --- Socket Listeners Setup ---
        socket.on("userconnected", (res) => { console.log("userconnected:", res); }); // No direct state update needed for `setResponse` if not used
        socket.on("balanceUpdated", (newBalance) => { setUserBalance(newBalance); });
        socket.on("gameStatusUpdate", (status) => { setGameStatus(status); });

        // ⭐ NEW: Listen for initial card states (full board sync on join)
        socket.on("initialCardStates", handleInitialCardStates);

        // ⭐ REVISED: `otherCardSelected` - for real-time updates when *another user* selects a card
        // This receives { telegramId: otherId, cardId }
        socket.on("otherCardSelected", ({ telegramId: otherId, cardId }) => {
            console.log(`💡 Other card selected: Card ${cardId} by ${otherId}`);
            setAllTakenCardsMap((prev) => ({
                ...prev,
                [cardId]: otherId, // Store as { cardId: telegramId }
            }));
        });

        // ⭐ `cardConfirmed` - for when *your* selection is confirmed by the backend
        socket.on("cardConfirmed", (data) => {
            console.log("DEBUG: Frontend received cardConfirmed data:", data);
            const confirmedCardId = Number(data.cardId);
            setCartelaIdInParent(confirmedCardId); // Update parent's state
            setCartela(data.card); // Update local bingo card display
            sessionStorage.setItem("mySelectedCardId", confirmedCardId);
            setGameStatus("Ready to Start");
            emitLockRef.current = false; // Release lock after successful confirmation

            // Immediately update the `allTakenCardsMap` for your own selection for snappy UI
            setAllTakenCardsMap(prev => ({
                ...prev,
                [confirmedCardId]: telegramId // Mark your new card as taken by you
            }));
        });

        // ⭐ `cardUnavailable` - when you try to select a card already taken
        socket.on("cardUnavailable", ({ cardId }) => {
            setAlertMessage(`🚫 Card ${cardId} is already taken by another player.`);
            // If the user tried to select this card, ensure their local state is cleared for it
            if (cartelaId === Number(cardId)) { // If it was *my* currently selected card visually
                setCartela([]); // Clear the visual card
                setCartelaIdInParent(null); // Clear the selected card ID
                sessionStorage.removeItem("mySelectedCardId");
            }
            emitLockRef.current = false; // Release lock if selection failed
        });

        // ⭐ `cardError` - for general errors during card selection
        socket.on("cardError", ({ message }) => {
            setAlertMessage(message || "Card selection failed.");
            setCartela([]);
            setCartelaIdInParent(null);
            sessionStorage.removeItem("mySelectedCardId");
            emitLockRef.current = false; // Release lock if error occurred
        });

        // ⭐ `cardReleased` and `cardAvailable` are handled by their useCallback wrappers
        socket.on("cardReleased", handleCardReleased);
        socket.on("cardAvailable", handleCardAvailable);

        socket.on("gameid", (data) => {
            setPlayerCount(data.numberOfPlayers);
            console.log("number of players received", data.numberOfPlayers);
        });

        socket.on("error", (err) => {
            console.error("Socket error:", err);
            setAlertMessage(err.message);
        });

        // ⭐ `cardsReset` - for full game resets (clears all card states)
        socket.on("cardsReset", ({ gameId: resetGameId }) => {
            if (resetGameId === gameId) {
                setAllTakenCardsMap({}); // Clear all taken cards
                setCartela([]); // Clear my card
                setCartelaIdInParent(null); // Clear my card ID
                sessionStorage.removeItem("mySelectedCardId");
                console.log("🔄 Cards have been reset for this game.");
                hasInitialSyncRun.current = false; // Allow re-sync on next mount/connect
            }
        });

        // --- Initial Sync Trigger and Reconnect Logic ---
        performInitialGameSync(); // Attempt sync immediately on component mount
        socket.on("connect", performInitialGameSync); // Attempt sync on reconnect

        socket.on("disconnect", () => {
            console.log("🔴 Socket disconnected — resetting sync flag.");
            hasInitialSyncRun.current = false; // Allow re-sync on next connect
        });

        // Initial fetch of user data
        fetchUserData(telegramId);

        // --- Cleanup Function ---
        return () => {
            console.log("🟡 Cleanup function running for Bingo.jsx useEffect.");
            if (socket) { // Ensure socket exists before trying to turn off listeners
                socket.off("userconnected");
                socket.off("balanceUpdated");
                socket.off("gameStatusUpdate");
                socket.off("initialCardStates", handleInitialCardStates);
                socket.off("otherCardSelected");
                socket.off("cardConfirmed");
                socket.off("cardUnavailable");
                socket.off("cardError");
                socket.off("cardReleased", handleCardReleased);
                socket.off("cardAvailable", handleCardAvailable);
                socket.off("gameid");
                socket.off("error");
                socket.off("cardsReset");
                socket.off("connect", performInitialGameSync);
                socket.off("disconnect");
            }
            hasInitialSyncRun.current = false; // Reset sync flag on unmount
        };
    }, [
        telegramId, gameId, navigate, socket, performInitialGameSync,
        handleInitialCardStates, handleCardReleased, handleCardAvailable,
        setCartelaIdInParent, cartelaId // Include all dependencies of useCallback functions used here
    ]);

    // `handleLocalCartelaIdChange` should update `cartela` and `cartelaIdInParent`
    const handleLocalCartelaIdChange = useCallback((newCartelaId) => {
        console.log(`🔍 Bingo.jsx: handleLocalCartelaIdChange called with: ${newCartelaId}`);
        const selectedCard = bingoCards.find(card => card.id === newCartelaId);
        if (selectedCard) {
            setCartela(selectedCard.card);
            if (setCartelaIdInParent) {
                setCartelaIdInParent(newCartelaId);
            }
        } else {
            setCartela([]); // Clear card if not found
            if (setCartelaIdInParent) {
                setCartelaIdInParent(null); // Inform parent to clear
            }
        }
    }, [setCartelaIdInParent]);

    // ⭐ REVISED: `handleNumberClick` - Your main click logic for selecting a card
    const handleNumberClick = (number) => {
        console.log("Clicked button ID:", number);

        // 1. Prevent action if emit is locked and it's not a new card selection
        if (emitLockRef.current) {
            console.log("Emit locked. Waiting for backend confirmation/error.");
            return; // Exit if a selection is already in progress
        }

        // 2. Find the selected card data
        const selectedCard = bingoCards.find(card => card.id === number);
        if (!selectedCard) {
            handleLocalCartelaIdChange(null);
            console.error("Card not found for ID:", number);
            return;
        }

        // 3. Check if the card is already taken by someone else
        if (allTakenCardsMap[number] && String(allTakenCardsMap[number]) !== String(telegramId)) {
            setAlertMessage(`🚫 Card ${number} is already taken by another player.`);
            return; // Do not proceed if card is taken by someone else
        }

        // 4. Set lock BEFORE emitting to prevent rapid multiple clicks
        emitLockRef.current = true;
        console.log("Emit lock acquired.");

        // 5. Update local UI immediately for responsiveness (optimistic update)
        handleLocalCartelaIdChange(number);
        setGameStatus("Ready to Start");
        sessionStorage.setItem("mySelectedCardId", number); // Store my selected card ID for persistence

        // 6. Emit to backend
        socket.emit("cardSelected", {
            telegramId,
            gameId,
            cardId: number,
            card: selectedCard.card,
        });
        console.log("Card emitted to the backend:", number);
    };

    // --- Game Start/End/Polling Logic (KEEP AS IS) ---
    useEffect(() => {
        socket.on("gameStart", () => {
            setGameStarted(true);
        });
        return () => {
            socket.off("gameStart");
        };
    }, [socket]);

    useEffect(() => {
        socket.on("gameFinished", () => {
            setGameStarted(false);
        });
        return () => {
            socket.off("gameFinished");
        };
    }, [socket]);

    const resetGame = () => {
        window.location.reload();
        console.log("page refreshed");
    };

    useEffect(() => {
        socket.on("gameEnded", () => {
            setGameStarted(false);
            setAlertMessage("");
            sessionStorage.removeItem("mySelectedCardId");
        });
        return () => socket.off("gameEnded");
    }, [socket]);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`https://bingobot-backend-bwdo.onrender.com/api/games/${gameId}/status`);
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

    const startGame = async () => {
        if (isStarting) return;
        setIsStarting(true);

        try {
            const statusRes = await fetch(`https://bingobot-backend-bwdo.onrender.com/api/games/${gameId}/status`);
            const statusData = await statusRes.json();

            if (statusData.exists && statusData.isActive) {
                alert("🚫 A game is already running or being initialized. Please wait.");
                setIsStarting(false);
                return;
            }

            const response = await fetch("https://bingobot-backend-bwdo.onrender.com/api/games/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gameId, telegramId }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                socket.emit("joinGame", { gameId, telegramId });

                socket.off("playerCountUpdate").on("playerCountUpdate", ({ playerCount }) => {
                    setPlayerCount(playerCount);
                });

                socket.off("gameId").on("gameId", (res) => {
                    const { gameId: receivedGameId, telegramId: receivedTelegramId, numberOfPlayers: gamePagePlayerCount } = res;
                    if (receivedGameId && receivedTelegramId) {
                        navigate("/game", {
                            state: {
                                gameId: receivedGameId,
                                telegramId: receivedTelegramId,
                                cartelaId,
                                cartela,
                                playerCount: gamePagePlayerCount,
                            },
                        });
                    } else {
                        setAlertMessage("Invalid game or user data received!");
                    }
                });
            } else {
                setAlertMessage(data.error || "Error starting the game");
                console.error("Game start error:", data.error);
            }
        } catch (error) {
            setAlertMessage("Error connecting to the backend");
            console.error("Connection error:", error);
        } finally {
            setIsStarting(false);
        }
    };

    // --- JSX Return Structure (REVISED CARD RENDERING) ---
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
                        <span className="font-bold">{playerCount}</span>
                    </div>
                    <div className={`${cardBg} ${cardText} px-10 py-1 rounded-3xl text-center text-sm font-bold`}>
                        Game Choice<br />
                        <span className="font-bold">{gameId} </span>
                    </div>
                </div>

                <div className="grid grid-cols-10 gap-1 py-1 px-2 max-w-lg w-full text-xs">
                    {numbers.map((num) => {
                        // Determine if *this specific client* has selected this card (from parent prop `cartelaId`)
                        const isMyCard = cartelaId === num;

                        // Determine if *any other client* has selected this card
                        // Check `allTakenCardsMap` if the current `num` is a key and its value (telegramId) is NOT mine
                        const isOtherCard = allTakenCardsMap[num] && String(allTakenCardsMap[num]) !== String(telegramId);

                        // Decide if the button should be disabled
                        // Disable if: it's taken by someone else OR emitLock is active (preventing new selections while one is in flight)
                        const isDisabled = isOtherCard || emitLockRef.current;

                        return (
                            <button
                                key={num}
                                onClick={() => handleNumberClick(num)}
                                disabled={isDisabled}
                                className={`w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 font-bold cursor-pointer transition-all duration-200 text-xs
                                    ${isMyCard ? myCardBg : isOtherCard ? otherCardBg : defaultCardBg}
                                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}` // Visual feedback for disabled
                                }
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
}

export default Bingo;