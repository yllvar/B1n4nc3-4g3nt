import TradingClient from "./client"

export default function TradingPage() {
  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8 bg-background">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">SOL/USDT Scalping Strategy</h1>
        <TradingClient symbol="solusdt" />
      </div>
    </main>
  )
}
