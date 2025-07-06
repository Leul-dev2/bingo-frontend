import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

function SaveAndRedirect() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    amount: "",
    currency: "ETB",
    email: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    telegramId: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tx_ref = searchParams.get("tx_ref");
    const telegramId = searchParams.get("telegramId");
    const amount = searchParams.get("amount");

    if (!tx_ref || !telegramId || !amount) {
      console.error("❌ Missing required query parameters.");
      return;
    }

    localStorage.setItem("tx_ref", tx_ref);

    // ✅ Fetch user info from your backend
    const fetchUser = async () => {
      try {
        const res = await axios.get(
          `https://bingobot-backend-bwdo.onrender.com/api/payment/userinfo?telegramId=${telegramId}`
        );
        const user = res.data;

        setForm((prevForm) => ({
          ...prevForm,
          amount,
          telegramId,
          email: `${user.username || "user"}@telegram.com`,
          first_name: user.username || "TelegramUser",
          last_name: "Telegram",
          phone_number: user.phoneNumber || "",
        }));
      } catch (err) {
        console.error("❌ Error fetching user info:", err);
      }
    };

    fetchUser();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post("https://chapa-backend.onrender.com/accept-payment", {
        ...form,
        tx_ref: localStorage.getItem("tx_ref"),
      });

      alert("✅ Payment initiated! Redirecting...");
      window.location.href = `tg://resolve?domain=bingobosssbot`; // ✅ redirect to your bot
    } catch (err) {
      console.error("❌ Failed to send payment:", err);
      alert("❌ Failed to initiate payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-xl p-8 rounded-xl w-full max-w-md border border-gray-300"
      >
        <h2 className="text-2xl font-bold text-center text-green-700 mb-6">
          Confirm Payment
        </h2>

        {[
          { name: "first_name", label: "First Name", type: "text" },
          { name: "last_name", label: "Last Name", type: "text" },
          { name: "email", label: "Email", type: "email" },
          { name: "phone_number", label: "Phone Number", type: "tel" },
          { name: "amount", label: "Amount (ETB)", type: "number", min: 1 },
        ].map(({ name, label, type, min }) => (
          <label key={name} className="block mb-4">
            <span className="text-gray-700 font-semibold block mb-1">
              {label}
            </span>
            <input
              name={name}
              type={type}
              min={min}
              value={form[name]}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>
        ))}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 font-semibold text-white rounded-md transition ${
            loading
              ? "bg-green-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading ? "Processing..." : "Pay Now"}
        </button>
      </form>
    </div>
  );
}

export default SaveAndRedirect;
