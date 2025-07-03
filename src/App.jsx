import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Bingo from "./components/Bingo";
import BingoGame from "./components/nextpg";
import WinnerPage from "./components/WinnerPage";
import History from "./components/Bing-Pges/history";
import Profile from "./components/Bing-Pges/profile";
import Score from "./components/Bing-Pges/score";
import Wallet from "./components/Bing-Pges/wallet";
import Layout from "./components/Bing-Pges/Layout"; 
import  PaymentSuccess from './components/payment/PaymentSuccess';
import  PaymentForm  from './components/payment/paymentForm';

const App = () => {
  const [cartela, setCartela] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);

  const [isBlackToggleOn, setIsBlackToggleOn] = useState(() => {
    // Read from localStorage on first load
    const saved = localStorage.getItem("blackToggle");
    return saved === "true"; // defaults to false
  });

  useEffect(() => {
    // Update localStorage whenever it changes
    localStorage.setItem("blackToggle", String(isBlackToggleOn));
  }, [isBlackToggleOn]);

  return (
    <Router>
      <Routes>
        {/* Routes WITHOUT Nav */}
        <Route
          path="/game"
          element={<BingoGame cartela={cartela} selectedNumber={selectedNumber} />}
        />
        <Route path="/winnerPage" element={<WinnerPage />} />
         <Route path="/PaymentForm" element={<PaymentForm />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />

        {/* Routes WITH Nav */}
        <Route path="/" element={<Layout isBlackToggleOn={isBlackToggleOn} />}>
          <Route
            index
            element={
              <Bingo
                setCartela={setCartela}
                setSelectedNumber={setSelectedNumber}
                isBlackToggleOn={isBlackToggleOn}
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
    </Router>
  );
};

export default App;
