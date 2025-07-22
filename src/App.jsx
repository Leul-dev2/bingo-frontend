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
import  PaymentSuccess from "./components/payment/CheckDeposite";
import  PaymentForm  from "./components/payment/DepositeForm";
//import SaveAndRedirect from "./components/payment/DepsoiteForm-bot"
import Instruction from "./components/instruction/instruction";
import WithdrawForm from "./components/payment/WithdrawalForm";
import CheckWithdrawalPage from "./components/payment/CheckWithdrwal";

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
        {/*  <Route path="/save-and-redirect" element={<SaveAndRedirect />} />*/} 
        <Route path="/instruction" element={<Instruction />} />
        <Route path="/withdrwal-Form" element={<WithdrawForm />} />
        <Route path="/Check-Withdraw" element={<CheckWithdrawalPage />} />





        {/* Routes WITH Nav */}
        <Route path="/" element={<Layout isBlackToggleOn={isBlackToggleOn} />} >
          <Route
            index
            element={
              <Bingo
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
