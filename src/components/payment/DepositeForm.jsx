import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

const MIN_DEPOSIT = 50; // ✅ Centralized constant

function PaymentForm() {
  const [searchParams] = useSearchParams();
  const telegramId = searchParams.get("user");

  const [form, setForm] = useState({
    amount: "",
    currency: "ETB",
    first_name: "",
    last_name: "",
    phone_number: "",
    telegramId: "",
    username: "",
  });

  const [loading, setLoading] = useState(false);
  const [userReady, setUserReady] = useState(false);

  useEffect(() => {
    if (!telegramId) {
      console.error("❌ Missing 'user' (telegramId) in URL.");
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await axios.get(
          `https://bingo-backend-8929.onrender.com/api/payment/userinfo?telegramId=${telegramId}`
        );

        const user = res.data;
        setForm((prev) => ({
          ...prev,
          telegramId,
          username: user.username || "TelegramUser",
          first_name: user.username || "TelegramUser",
          last_name: "Telegram",
          phone_number: user.phoneNumber || "",
        }));

        setUserReady(true);
      } catch (err) {
        console.error("❌ Error fetching user info:", err);
      }
    };

    fetchUser();
  }, [telegramId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  
const handleSubmit = async (e) => {
  e.preventDefault();

  if (loading) return; // 🛡 Prevent double-submit

  if (!userReady) {
    alert("User info not loaded yet.");
    return;
  }

  const amount = parseFloat(form.amount);
  if (isNaN(amount) || amount < MIN_DEPOSIT) {
    alert(`❌ Minimum deposit is ${MIN_DEPOSIT} Birr.`);
    return;
  }

  if (!form.first_name || !form.phone_number) {
    alert("❌ Please complete all fields.");
    return;
  }

  // ✅ Clean and validate phone number
  let cleanedPhone = form.phone_number.replace(/\s+/g, '').replace(/^\+/, '');
  const phoneRegex = /^(09\d{8}|07\d{8}|2519\d{8}|2517\d{8})$/;

  if (!phoneRegex.test(cleanedPhone)) {
    alert("❌ Invalid phone number format. Use 09XXXXXXXX, 07XXXXXXXX, or 2519XXXXXXXX.");
    return;
  }

  // ✅ Normalize to 251xxxxxxxxx format
  let normalizedPhone = cleanedPhone;
  if (normalizedPhone.startsWith("09") || normalizedPhone.startsWith("07")) {
    normalizedPhone = "251" + normalizedPhone.slice(1);
  }

  // ✅ Updated form to submit
  const updatedForm = {
    ...form,
    phone_number: normalizedPhone,
  };

  setLoading(true);
  localStorage.removeItem("tx_ref");
  const tx_ref = `${form.first_name}-${Date.now()}`;
  localStorage.setItem("tx_ref", tx_ref);

  try {
    const res = await axios.post(
      "https://bingo-backend-8929.onrender.com/api/payment/accept-payment",
      {
        ...updatedForm,
        tx_ref,
      }
    );

    const redirectUrl = res?.data?.data?.checkout_url;

    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      alert("Something went wrong. Try again.");
      setLoading(false);
    }
  } catch (err) {
    console.error("❌ Payment init failed:", err);
    alert("Payment failed.");
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white bg-opacity-90 backdrop-blur-md p-8 rounded-3xl max-w-md w-full shadow-xl border border-green-300"
      >
        <h2 className="text-3xl font-bold mb-6 text-center text-green-700 drop-shadow-md">
          Deposit with Chapa
        </h2>

        <div className="mb-6 text-center text-lg font-semibold text-gray-800">
          User: <span className="text-blue-600">@{form.username}</span>
        </div>

        <label className="block mb-6">
          <span className="text-gray-700 font-semibold block mb-1">Amount (ETB)</span>
          <input
            name="amount"
            type="number"
            min={MIN_DEPOSIT}
            value={form.amount}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>

        <label className="block mb-6">
          <span className="text-gray-700 font-semibold block mb-1">Phone Number</span>
        <input
  name="phone_number"
  type="tel"
  value={form.phone_number}
  onChange={handleChange}
  required
  placeholder="e.g. 09XXXXXXXX or 07XXXXXXXX or 2519XXXXXXXX"
  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
/>

        </label>

        <button
          type="submit"
          disabled={!form.amount || loading || !userReady}
          className={`w-full ${
            loading || !userReady
              ? "bg-green-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          } text-white font-bold py-3 rounded-lg shadow-md transition duration-300`}
        >
          {loading ? "Processing..." : "Proceed to Pay"}
        </button>
      </form>
    </div>
  );
}

export default PaymentForm;
