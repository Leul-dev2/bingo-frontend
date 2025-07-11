import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

export default function CheckWithdrawalPage() {
  const [status, setStatus] = useState("checking");
  const [manualTries, setManualTries] = useState(0);
  const [txRef, setTxRef] = useState("");
  const [inputRef, setInputRef] = useState("");
  const [maxReached, setMaxReached] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchParams] = useSearchParams();

  // Indicates if current ref is from user input or from URL/localStorage
  const [isManualRef, setIsManualRef] = useState(false);

  // Fetch tx_ref from URL or localStorage once on mount
 useEffect(() => {
  const refFromUrl = searchParams.get("ref");
  if (refFromUrl) {
    setTxRef(refFromUrl);
    setIsManualRef(false);
    autoCheckStatus(refFromUrl);
  } else {
    setStatus("no-ref");
    setIsManualRef(true);
  }
}, []);

  // Auto check function for refs from URL/localStorage (3 tries, no manual count)
  const autoCheckStatus = async (ref) => {
    setStatus("checking");
    for (let i = 0; i < 3; i++) {
      try {
        const res = await axios.get(`https://bingobot-backend-bwdo.onrender.com/api/payment/verify/${ref}`);
        if (res.data.status === "success") {
          setStatus("success");
          return;
        }
      } catch (err) {
        console.error("Error verifying withdrawal:", err);
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    setStatus("not-yet");
  };

  // Manual retry - only for user-input refs, max 3 tries tracked here
  const handleRetry = async () => {
    if (manualTries >= 3) return;
    try {
      const res = await axios.get(`https://bingobot-backend-bwdo.onrender.com/api/payment/verify/${txRef}`);
      if (res.data.status === "success") {
        setStatus("success");
      } else {
        const newCount = manualTries + 1;
        setManualTries(newCount);
        if (newCount >= 3) {
          setMaxReached(true);
        }
        setStatus("not-yet");
      }
    } catch (err) {
      console.error("Retry error:", err);
    }
  };

  // Handle manual input submit: no caching, no auto checks, reset manual tries
  const handleInputSubmit = async (e) => {
    e.preventDefault();
    if (inputRef.trim()) {
      const ref = inputRef.trim();
      setTxRef(ref);
      setIsManualRef(true);
      setManualTries(0);
      setMaxReached(false);
      setStatus("checking");
      try {
        const res = await axios.get(`https://bingobot-backend-bwdo.onrender.com/api/payment/verify/${ref}`);
        if (res.data.status === "success") {
          setStatus("success");
        } else {
          setStatus("not-yet");
        }
      } catch (err) {
        console.error("Manual input check error:", err);
        setStatus("not-yet");
      }
    }
  };

  const copyRef = () => {
    navigator.clipboard.writeText(txRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4 text-indigo-600">Withdrawal Status</h1>

        {status === "checking" && <p className="text-gray-600">🔍 Checking your withdrawal status...</p>}

        {status === "success" && (
          <p className="text-green-600 font-semibold">✅ Your withdrawal was successful!</p>
        )}

        {status === "not-yet" && !maxReached && isManualRef && (
          <>
            <p className="text-yellow-600 font-semibold mb-2">⏳ Still processing...</p>
            <button
              onClick={handleRetry}
              disabled={manualTries >= 3}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl mb-3"
            >
              🔁 Check Again ({3 - manualTries} tries left)
            </button>
          </>
        )}

        {status === "not-yet" && maxReached && (
          <>
            <p className="text-red-500 font-semibold mb-2">
              ❌ You've reached the maximum retry limit.
            </p>
            <p className="text-sm text-gray-500">Copy your reference and check again later in the Telegram bot.</p>
          </>
        )}

        {status === "no-ref" && (
          <form onSubmit={handleInputSubmit} className="mt-4">
            <p className="text-red-500 mb-2">❌ No transaction reference found.</p>
            <input
              type="text"
              placeholder="Enter your transaction ref"
              value={inputRef}
              onChange={(e) => setInputRef(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-2"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl w-full"
            >
              🔍 Check Status
            </button>
          </form>
        )}

        {/* Show copy only if we have a ref */}
        {txRef && (
          <div className="mt-6">
            <p className="text-sm text-gray-600 mb-1">Reference:</p>
            <div className="bg-gray-100 rounded-md px-4 py-2 flex items-center justify-between">
              <code className="text-xs text-gray-800 break-all">{txRef}</code>
              <button
                onClick={copyRef}
                className="text-blue-600 hover:underline text-sm ml-2"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {txRef && (
  <button
    onClick={() => {
      setTxRef("");
      setInputRef("");
      setStatus("no-ref");
      setManualTries(0);
      setMaxReached(false);
      setIsManualRef(true);
    }}
    className="m-2 text-sm text-red-600 hover:underline"
  >
    Clear Reference
  </button>
)}


        {/* Show retry button for auto refs (URL/localStorage) only if not success */}
        {!isManualRef && status === "not-yet" && (
          <p className="text-yellow-600 mt-3 text-sm">
            The system will automatically check the withdrawal status up to 3 times.
          </p>
        )}

        <a
          href="tg://resolve?domain=bingobosssbot"
          className="inline-block mt-6 text-white bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-xl"
        >
          🔙 Back to Telegram Bot
        </a>
      </div>
    </div>
  );
}
