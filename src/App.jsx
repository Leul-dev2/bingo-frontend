// App.jsx
import React, { useState, useEffect} from "react";
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
//const location = useLocation();


// Initialize socket connection globally
const socket = io("https://bingobot-backend-bwdo.onrender.com");

// New wrapper component to handle initial URL params
const AppContent = ({ isBlackToggleOn, setIsBlackToggleOn, socket }) => {

   console.log("🔥 AppContent component rendered/re-rendered.");
  // Now, useSearchParams is inside the Router's context
  const [searchParams] = useSearchParams();
  const urlTelegramId = searchParams.get("user");
  const urlGameId = searchParams.get("game");

  // State for gameId and telegramId, initialized from URL or localStorage
  const [telegramId, setTelegramId] = useState(
    urlTelegramId || localStorage.getItem("telegramId")
  );
  const [gameId, setGameId] = useState(
    urlGameId || localStorage.getItem("gameChoice")
  );

  // LIFTED STATE: State to hold the currently selected card ID
  const [selectedCartelaId, setSelectedCartelaId] = useState(null);

  useEffect(() => {
    // Only update localStorage if URL params exist and differ from stored
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
            telegramId={telegramId} // Pass telegramId and gameId if needed here
            gameId={gameId}
          />
        }
      />
      <Route path="/winnerPage" element={<WinnerPage />} />
      <Route path="/PaymentForm" element={<PaymentForm />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/instruction" element={<Instruction />} />
      <Route path="/withdrwal-Form" element={<WithdrawForm />} />
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