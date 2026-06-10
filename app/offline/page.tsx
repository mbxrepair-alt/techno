"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
      {/* Icône signal */}
      <div className="mb-8 relative">
        <div className="w-24 h-24 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.3)]">
          <svg
            className="w-12 h-12 text-orange-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M3 3l18 18"
            />
          </svg>
        </div>
        {/* Pulse */}
        <div className="absolute inset-0 rounded-full border border-orange-500/20 animate-ping" />
      </div>

      <h1 className="text-3xl font-bold text-white mb-3">
        Pas de connexion
      </h1>
      <p className="text-gray-400 text-lg mb-2">
        Vous êtes hors ligne
      </p>
      <p className="text-gray-500 text-sm mb-10 max-w-xs">
        Vérifiez votre connexion Wi-Fi ou données mobiles, puis réessayez.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="px-8 py-3 bg-orange-500 hover:bg-orange-400 text-black font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] active:scale-95"
      >
        Réessayer
      </button>

      <p className="mt-8 text-gray-600 text-xs">
        MBX Réparations
      </p>
    </div>
  );
}
