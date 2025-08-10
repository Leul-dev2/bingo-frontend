// App.jsx
import React, { useState, useEffect, useRef } from "react"; // Import useRef
import { BrowserRouter as Router, Routes, Route, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";

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

// Initialize socket connection globally
const socket = io("https://bingobot-backend-bwdo.onrender.com");

// New wrapper component to handle initial URL params
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

  // LIFTED STATE: State to hold the currently selected card ID
  const [selectedCartelaId, setSelectedCartelaId] = useState(null);

  // LIFTED STATE & REF: Lifted from Bingo component
  const [otherSelectedCards, setOtherSelectedCards] = useState({});
  const emitLockRef = useRef(false);

  // Define the centralized client-side card cleanup function
  const clearClientCardState = (cardIdToClear) => {
    console.log("♻️ Client-side card state cleanup initiated for:", cardIdToClear);
    //setSelectedCartelaId(null); // Clear the main selected card
    emitLockRef.current = false; // Reset the lock

    setOtherSelectedCards((prevCards) => {
      const updated = { ...prevCards };
      const keyToRemove = Object.keys(updated).find(
        (key) =>
          updated[key] === cardIdToClear ||
          String(updated[key]) === String(cardIdToClear)
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

  // Move the socket listener for "cardAvailable" here in AppContent
  useEffect(() => {
    if (socket) {
      console.log("Attaching cardAvailable listener in AppContent");
      // Use a named function or a useCallback wrapped function if you need
      // to avoid re-creating this handler on every render for optimization
      const handleCardAvailable = ({ cardId }) => {
        console.log("♻️ Socket Event: cardAvailable received for:", cardId);
        // Call the centralized cleanup function
       clearClientCardState(cardId);
      };

      socket.on("cardAvailable", handleCardAvailable);

      return () => {
        console.log("Detaching cardAvailable listener in AppContent");
        socket.off("cardAvailable", handleCardAvailable);
      };
    }
  }, [socket]); // Dependencies: socket

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
      {/* Routes WITHOUT Nav (Layout) */}
      <Route
        path="/game"
        element={
          <BingoGame
            selectedCartelaId={selectedCartelaId}
            telegramId={telegramId}
            gameId={gameId}
            // Pass the states/ref needed for BingoGame if it manipulates them
            otherSelectedCards={otherSelectedCards}
            emitLockRef={emitLockRef}
            // If BingoGame can also trigger the cleanup, pass the function
            onClearClientCardState={clearClientCardState}
          />
        }
      />
      <Route path="/winnerPage" element={<WinnerPage />} />
      <Route path="/PaymentForm" element={<PaymentForm />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/instruction" element={<Instruction />} />
      <Route path="/withdrawal-Form" element={<WithdrawForm />} />      
      <Route path="/Check-Withdraw" element={<CheckWithdrawalPage />} />

      {/* Routes WITH Nav - Layout will now handle the common logic */}
      <Route
        path="/"
        element={
          <Layout
            isBlackToggleOn={isBlackToggleOn}
            socket={socket}
            gameId={gameId}
            telegramId={telegramId}
            cartelaId={selectedCartelaId}
            setCartelaIdInParent={setSelectedCartelaId}
            // NEW PROP: Pass the centralized cleanup function to Layout
            onClearClientCardState={clearClientCardState}
          />
        }
      >
        <Route
          index
          element={
            <Bingo
              isBlackToggleOn={isBlackToggleOn}
              setCartelaIdInParent={setSelectedCartelaId}
              cartelaId={selectedCartelaId}
              socket={socket}
              // NEW PROPS for Bingo:
              otherSelectedCards={otherSelectedCards}
              setOtherSelectedCards={setOtherSelectedCards}
              emitLockRef={emitLockRef}
              // If Bingo needs to explicitly trigger the cleanup, pass it
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