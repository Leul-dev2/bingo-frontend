import { useEffect, useState } from "react";
import axios from "axios";
import useTelegramWebApp from "./useTelegramWebApp"; // import the hook

function PaymentSuccess() {
  useTelegramWebApp();

  const [status, setStatus] = useState("⏳ Checking payment status...");
  const [txRef, setTxRef] = useState(null);
  const [amount, setAmount] = useState(null);

  useEffect(() => {
    const tx_ref = localStorage.getItem("tx_ref");
    setTxRef(tx_ref);

    const checkPayment = async () => {
      try {
        const res = await axios.get(
          `https://bingobot-backend-bwdo.onrender.com/api/payment/check-payment/${tx_ref}`
        );
        if (res.data.status === "success") {
          setStatus("✅ Payment confirmed!");
          setAmount(res.data.amount);
        } else {
          setTimeout(checkPayment, 5000);
        }
      } catch (err) {
        setStatus("❌ Error verifying payment.");
      }
    };

    if (tx_ref) {
      checkPayment();
    } else {
      setStatus("⚠️ No payment reference found.");
    }
  }, []);

  const handleClose = () => {
    if (window.Telegram?.WebApp?.close) {
      window.Telegram.WebApp.close();
    } else {
      window.location.href = "https://t.me/bossbingosbot";
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-green-100 via-white to-blue-100 px-6">
      <div className="relative bg-white shadow-2xl rounded-2xl p-8 max-w-md w-full border border-green-300 animate-fade-in">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 bg-gradient-to-br from-red-400 via-pink-500 to-purple-500 text-white text-3xl rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:scale-110 transform transition-all duration-300 hover:rotate-90"
          aria-label="Close"
          title="Close"
        >
          &times;
        </button>

        <h1 className="text-2xl font-bold text-green-700 text-center mb-4">
          Payment Status
        </h1>

        <div className="text-center text-lg text-gray-800 space-y-2">
          <p className="font-semibold">{status}</p>
          {txRef && status !== "✅ Payment confirmed!" && (
            <p className="text-sm text-gray-600">
              Transaction Ref:{" "}
              <span className="font-mono text-green-800">{txRef}</span>
            </p>
          )}
        </div>

        {status === "✅ Payment confirmed!" && (
          <div className="mt-6 text-center">
            <p className="text-green-600 font-semibold text-lg">
              🎉 Thank you for your payment!
            </p>
            <p className="text-sm text-gray-500 mt-1">
              You may now close this tab or continue using the app.
            </p>

            {/* ✅ Balance Section */}
            <div className="mt-6 bg-green-50 p-4 rounded-xl border border-green-300 shadow-sm">
              <h2 className="text-lg font-bold text-green-700">💰 DEPOSITED </h2>
              <p className="text-green-800 text-xl mt-2">
                {amount ? `ETB ${amount}` : "Loading..."}
              </p>
            </div>
          </div>
        )}

        {status === "❌ Error verifying payment." && (
          <div className="mt-6 text-center">
            <p className="text-red-600 font-semibold">
              Please try again later or contact support.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentSuccess;
