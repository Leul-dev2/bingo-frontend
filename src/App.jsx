// App.jsx
import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, useSearchParams } from "react-router-dom";
import socket from "../socket"; // ✅ Shared socket instance

// Import your components
import Bingo from "./components/Bingo";
import BingoGame from "./components/nextpg";
import WinnerPage from "./components/WinnerPage";
import History from "./components/Bing-Pges/history";
import Profile from "./components/Bing-Pges/profile";
import Score from "./components/Bing-Pges/score";
import Wallet from "./components/Bing-Pges/wallet";
import Layout from "./components/Bing-Pges/Layout";
import PaymentSuccess from "./components/payment/CheckDeposite";
import PaymentForm from "./components/payment/DepositeForm";
import Instruction from "./components/instruction/instruction";
import WithdrawForm from "./components/payment/WithdrawalForm";
import CheckWithdrawalPage from "./components/payment/CheckWithdrwal";
import WinnerFailed from "./components/WinnerFailed";
import AddBoard from "./components/AddBoard"; // ✅ Add this import

// Initialize socket connection globally
//const socket = io("https://api.bingoogame.com");

const AppContent = ({ isBlackToggleOn, setIsBlackToggleOn, socket }) => {
  console.log("🔥 AppContent component rendered/re-rendered.");
  const [searchParams] = useSearchParams();
  const urlTelegramId = searchParams.get("user");
  const urlGameId = searchParams.get("game");

  const [telegramId, setTelegramId] = useState(
    urlTelegramId || localStorage.getItem("telegramId")
  );
  const [gameId, setGameId] = useState(
    urlGameId || localStorage.getItem("gameChoice")
  );

  // -------------------------------------------------------------------
  // ⬇️ HERE ARE THE FIRST TWO FIXES ⬇️
  // -------------------------------------------------------------------

  // FIX 1: Rename state and initialize as an empty array [] for multi-card support
  const [selectedCartelaIds, setSelectedCartelaIds] = useState([]); 
  
  // -------------------------------------------------------------------
  
  const [otherSelectedCards, setOtherSelectedCards] = useState({});
  const emitLockRef = useRef(false);

  // Define the centralized client-side card cleanup function
  const clearClientCardState = (cardIdToClear) => {
    console.log("♻️ Client-side card state cleanup initiated for:", cardIdToClear);
    
    // ⭐ FIX: Only clear the main selected card if a game start is signaled (cardIdToClear is null)
    if (cardIdToClear === null) {
        // FIX 2: This setter now expects an array, so set it to []
        setSelectedCartelaIds([]); // <-- FIX
        sessionStorage.removeItem("mySelectedCardId"); // You should change this key too
        sessionStorage.removeItem("mySelectedCardIds"); // Good to clear both
        console.log("Game started, clearing your card selection.");
    }
    
    emitLockRef.current = false; // Reset the lock

    setOtherSelectedCards((prevCards) => {
      const updated = { ...prevCards };
      
      // If the game is starting and no specific card is passed, clear all other cards.
      if (!cardIdToClear) {
          console.log("Clearing all other selected cards.");
          return {};
      }

      // Otherwise, just remove the specified card.
      const keyToRemove = Object.keys(updated).find(
        (key) => String(updated[key]) === String(cardIdToClear)
      );

      if (keyToRemove) {
        delete updated[keyToRemove];
        console.log(`✅ Removed card ${cardIdToClear} from otherSelectedCards mapping`);
      } else {
        console.log("⚠️ Card not found in otherSelectedCards for client-side cleanup:", cardIdToClear);
      }
      return updated;
    });
  };

  useEffect(() => {
    if (socket) {
      console.log("Attaching socket listeners in AppContent");

      // ⭐ NEW: Listener for a full game reset
      const handleGameCardReset = () => {
        console.log("♻️ Socket Event: gameCardResetOngameStart received. Resetting all cards.");
        clearClientCardState(null); // Signal a full reset
      };

      // Existing listener for single card availability
      const handleCardAvailable = ({ cardId }) => {
        console.log("♻️ Socket Event: cardAvailable received for:", cardId);
        clearClientCardState(cardId); // Signal to clear a specific card
      };

      // Attach both listeners
      socket.on("gameCardResetOngameStart", handleGameCardReset);
      socket.on("cardAvailable", handleCardAvailable);


      // Clean up both listeners
      return () => {
        console.log("Detaching socket listeners in AppContent");
        socket.off("gameCardResetOngameStart", handleGameCardReset);
        socket.off("cardAvailable", handleCardAvailable);
      };
    }
  }, [socket]);

  useEffect(() => {
    if (urlTelegramId && urlTelegramId !== localStorage.getItem("telegramId")) {
      localStorage.setItem("telegramId", urlTelegramId);
      setTelegramId(urlTelegramId);
    }
    if (urlGameId && urlGameId !== localStorage.getItem("gameChoice")) {
      localStorage.setItem("gameChoice", urlGameId);
      setGameId(urlGameId);
    }
  }, [urlTelegramId, urlGameId]);

  useEffect(() => {
    localStorage.setItem("blackToggle", String(isBlackToggleOn));
  }, [isBlackToggleOn]);

  return (
    <Routes>
      <Route
        path="/game"
        element={
          <BingoGame
            // FIX 3: Pass the array state variable
            selectedCartelaIds={selectedCartelaIds} // <-- FIX (prop name might need changing in BingoGame too)
            telegramId={telegramId}
            gameId={gameId}
            otherSelectedCards={otherSelectedCards}
            emitLockRef={emitLockRef}
            onClearClientCardState={clearClientCardState}
          />
        }
      />
      <Route path="/add-board" element={<AddBoard
             socket={socket}
      />} /> {/* ✅ Add this route */}
      <Route path="/winnerPage" element={<WinnerPage />} />
      <Route path="/winnerFailed" element={<WinnerFailed />} />
      <Route path="/PaymentForm" element={<PaymentForm />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/instruction" element={<Instruction />} />
      <Route path="/withdrawal-Form" element={<WithdrawForm />} />
      <Route path="/Check-Withdraw" element={<CheckWithdrawalPage />} />

      <Route
        path="/"
        element={
          <Layout
            isBlackToggleOn={isBlackToggleOn}
            socket={socket}
            gameId={gameId}
            telegramId={telegramId}
            // FIX 4: Pass the array state variable
            cartelaIds={selectedCartelaIds} // <-- FIX (prop name might need changing in Layout too)
            setCartelaIdInParent={setSelectedCartelaIds} // Pass the correct setter
            onClearClientCardState={clearClientCardState}
          />
        }
      >
        <Route
          index
          element={
            <Bingo
              isBlackToggleOn={isBlackToggleOn}
              // FIX 5: Pass the correct setter and the state with the correct prop name
              setCartelaIdInParent={setSelectedCartelaIds} // <-- FIX
              cartelaIds={selectedCartelaIds} // <-- FIX
              socket={socket}
              otherSelectedCards={otherSelectedCards}
              setOtherSelectedCards={setOtherSelectedCards}
              emitLockRef={emitLockRef}
              onClearClientCardState={clearClientCardState}
            />
          }
        />
        <Route path="score" element={<Score isBlackToggleOn={isBlackToggleOn} />} />
        <Route path="history" element={<History isBlackToggleOn={isBlackToggleOn} />} />
        <Route path="wallet" element={<Wallet isBlackToggleOn={isBlackToggleOn} />} />
        <Route
          path="profile"
          element={
            <Profile
              setIsBlackToggleOn={setIsBlackToggleOn}
              isBlackToggleOn={isBlackToggleOn}
            />
          }
        />
      </Route>
    </Routes>
  );
};

const App = () => {
  const [isBlackToggleOn, setIsBlackToggleOn] = useState(() => {
    const saved = localStorage.getItem("blackToggle");
    return saved === "true";
  });

  return (
    <Router>
      <AppContent
        isBlackToggleOn={isBlackToggleOn}
        setIsBlackToggleOn={setIsBlackToggleOn}
        socket={socket}
      />
    </Router>
  );
};

export default App;