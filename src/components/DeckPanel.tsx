"use client";

export default function DeckPanel() {
  return (
    <div className="animate-in -mx-6 -mb-32">
      <iframe
        src="/deck.html"
        className="w-full border-0 rounded-lg"
        style={{ height: "calc(100vh - 180px)" }}
        title="JobPilot Demo Deck"
      />
    </div>
  );
}
