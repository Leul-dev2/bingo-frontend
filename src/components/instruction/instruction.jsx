export default function Instruction() {
  return (
    <div className="bg-gradient-to-b from-yellow-100 to-orange-100 min-h-screen py-8 px-4 text-gray-800 font-sans">
      <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-2xl p-6 space-y-6">
        <h1 className="text-3xl font-bold text-center text-orange-600">የቢንጎ ጨዋታ ህጎች</h1>

        <section>
          <h2 className="text-xl font-semibold text-blue-700 mb-2">መጫወቻ ካርድ</h2>
          <p>ጨዋታውን ለመጀመር ከሚመጣልን ከ1-100 የ30ወቻ ካርድ ውስጥ አንዱን እንመርጣለን።</p>
          <p>የመጫወቻ ካርዱ ላይ በቀይ ቀለም የተመረጡ ቁጥሮች የሚያሳዩት መጫወቻ ካርድ በሌላ ተጫዋች መመረጡን ነው።</p>
          <p>የመጫወቻ ካርድ ስንነካው ከታች በኩል ካርድ ቁጥሩ የሚይዘውን መጫወቻ ካርድ ያሳየናል።</p>
          <p>... (rest of the instructions below)</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-green-700 mb-2">ጨዋታ</h2>
          <p>ወደ ጨዋታው ለመግባት የምንፈልገውን ካርድ ከመረጥን በኋላ ከታች በኩል መሃል ላይ Play የሚለውን ክሊክ በማረግ ወደ ጨዋታው እንገባለን።</p>
          <p>active game የሚለው የሚያሳየን አሁን ላይ እየተካሄዱ ያሉ የጨዋታ ብዛቶችን ነው።</p>
          <p>... (continue game instructions)</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-2">አሸናፊ</h2>
          <p>ቁጥሮቹ ሲጠሩ ከመጫወቻ ካርዳችን ላይ እየመረጥን ወደጎን ወይም ወደታች ወይም ወደሁለቱም አግዳሚ ወይም አራቱን ማእዘናት ከመረጥን ወዲያውኑ ከታች በኩል bingo የሚለውን በመንካት ማሸነፍ እንችላለን።</p>
          <p>... (tie game rules)</p>
        </section>

        <p className="text-center text-sm text-gray-500">© 2025 Bingo Game</p>
      </div>
    </div>
  );
}
