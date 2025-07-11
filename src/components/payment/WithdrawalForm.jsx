import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// ✅ Unified Awash Color Theme for All
const banks = {
  "946": {
    logo: "/CBE-new.png",
    primaryColor: "#7F3F98",
    secondaryColor: "#F5EDF9",
  },
  "855": {
    logo: "/telebirr-new.webp",
    primaryColor: "#7F3F98",
    secondaryColor: "#F5EDF9",
  },
  "656": {
    name: "Awash Bank",
    logo: "/Awash_International_Bank.png",
    primaryColor: "#7F3F98", // Official purple
    secondaryColor: "#F5EDF9", // Light lavender (unchanged)
  },
  "772": {
    logo: "/bank_of_abyssinia-new.svg",
    primaryColor: "#7F3F98",
    secondaryColor: "#F5EDF9",
  },
};

export default function WithdrawForm() {
  const [searchParams] = useSearchParams();
  const [telegramId, setTelegramId] = useState("");
  const [bankId, setBankId] = useState("");
  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(true);

  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [btnHover, setBtnHover] = useState(false);

  // New: store user balance and loading state
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    const user = searchParams.get("user") || "";
    const bankParam = searchParams.get("bank") || "";

    if (!/^\d+$/.test(user) || !banks[bankParam]) {
      setLoading(false);
      return;
    }

    setTelegramId(user);
    setBankId(bankParam);
    setBank(banks[bankParam]);
    setLoading(false);
  }, [searchParams]);

  // Fetch user balance after telegramId is set
  useEffect(() => {
    if (!telegramId) return;

    async function fetchBalance() {
      setBalanceLoading(true);
      try {
        const res = await fetch(
          `https://bingobot-backend-bwdo.onrender.com/api/payment/balance?telegramId=${telegramId}`
        );
        if (!res.ok) throw new Error("Failed to fetch balance");

        const data = await res.json();
        setBalance(data.balance ?? 0);
      } catch (err) {
        console.error("❌ Error fetching balance:", err);
        setBalance(0);
      }
      setBalanceLoading(false);
    }

    fetchBalance();
  }, [telegramId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!telegramId || !bankId || !accountName || !accountNumber || !amount) {
      alert("❌ Please fill in all fields.");
      return;
    }

    if (!/^\d+$/.test(accountNumber)) {
      alert("❌ Account number must be numeric.");
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      alert("❌ Invalid amount.");
      return;
    }

    // Validate minimum withdrawal amount
    if (amt < 50) {
      alert("❌ Minimum withdrawal amount is 50 Birr.");
      return;
    }

    // Prevent submission while balance is loading
    if (balanceLoading) {
      alert("⏳ Loading your balance, please wait...");
      return;
    }

    // Ensure balance was successfully fetched
    if (balance === null) {
      alert("❌ Unable to verify your balance at the moment.");
      return;
    }

    // Check sufficient balance
    if (amt > balance) {
      alert(`❌ Insufficient balance. Your current balance is ${balance} Birr.`);
      return;
    }

    const body = {
      telegramId,
      bank_code: bankId,
      account_name: accountName,
      account_number: accountNumber,
      amount: amt,
      currency: "ETB",
      reference: `withdrawal-${telegramId}-${Date.now()}`,
    };

    try {
      const res = await fetch(
        "https://bingobot-backend-bwdo.onrender.com/api/payment/request-withdrawal",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert("✅ Withdrawal request sent successfully!");
        // Optionally clear form or reset amount here
        setAmount("");
      } else {
        alert("❌ Error: " + data.message);
      }
    } catch (error) {
      alert("❌ Network error: " + error.message);
    }
  };

  if (loading) {
    return (
      <p className="p-6 text-center text-gray-500 animate-pulse">
        ⏳ Loading withdrawal form...
      </p>
    );
  }

  if (!bank) {
    return (
      <div className="p-6 text-center text-red-600 font-semibold space-y-4">
        <p>⚠️ Something went wrong.</p>
        <p>
          We couldn’t verify the bank details from the link. Please go back to
          Telegram and try again.
        </p>
        <a
          href="https://t.me/bingobosssbot"
          className="text-white bg-red-500 px-4 py-2 rounded hover:bg-red-600 inline-block"
        >
          🔁 Retry via Bot
        </a>
      </div>
    );
  }

  return (
    <div
      className="max-w-md mx-auto p-6 rounded-xl shadow-xl mt-12"
      style={{ backgroundColor: bank.secondaryColor }}
    >
      {/* Bank Logo Full Width */}
      {/* Bank Logo + Name only for Awash */}
      <div className="w-full mb-8 text-center">
        <img
          src={bank.logo}
          alt="Bank Logo"
          className="w-full h-auto object-contain max-h-24 sm:max-h-28 mx-auto"
        />
        {bankId === "656" && bank.name && (
          <h1
            className="text-xl font-bold mt-2"
            style={{ color: bank.primaryColor }}
          >
            {bank.name}
          </h1>
        )}
      </div>

      <div className="mb-4 text-center font-semibold">
        {balanceLoading ? (
          <p>⏳ Loading balance...</p>
        ) : (
          <p>
            💰 Your current balance:{" "}
            <span className="font-bold">{balance ?? 0} Birr</span>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" value={telegramId} name="telegramId" />

        <div>
          <label
            htmlFor="accountName"
            className="block text-gray-700 font-medium mb-1"
          >
            Account Holder Name
          </label>
          <input
            id="accountName"
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            required
            placeholder="e.g., Mulugeta Bekele"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label
            htmlFor="accountNumber"
            className="block text-gray-700 font-medium mb-1"
          >
            {bankId === "855" ? "Phone Number" : "Account Number"}
          </label>
          <input
            id="accountNumber"
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            required
            placeholder={
              bankId === "855" ? "e.g., 0912345678" : "e.g., 100012345678"
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label
            htmlFor="amount"
            className="block text-gray-700 font-medium mb-1"
          >
            Amount (ETB)
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1"
            placeholder="e.g., 500"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <button
          type="submit"
          disabled={loading || balanceLoading}
          className={`w-full font-bold py-3 rounded-md transition duration-200 ${
            loading || balanceLoading
              ? "bg-gray-400 cursor-not-allowed"
              : btnHover
              ? "bg-[#333]"
              : ""
          }`}
          style={{
            backgroundColor:
              loading || balanceLoading
                ? undefined
                : btnHover
                ? "#333"
                : bank.primaryColor,
            color: "white",
          }}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
        >
          🚀 Request Withdrawal
        </button>
      </form>
    </div>
  );
}
