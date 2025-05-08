import { BusinessScraperForm } from "@/components/business-scraper-form"
import { ProtectedRoute } from "@/components/protected-route"

export default function Home() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Google My Business Scraper</h1>
          <p className="text-center text-gray-500 mb-8">Extract and process business data efficiently</p>
          <BusinessScraperForm />
          <div className="text-center mt-8 text-sm text-gray-500">Powered by The Cold Email Works</div>
        </div>
      </main>
    </ProtectedRoute>
  )
}
