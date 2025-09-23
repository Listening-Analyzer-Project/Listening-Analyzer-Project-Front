import { BarChart3 } from "lucide-react"

export default function StatsPage() {
  return (
    <div className="container mx-auto py-8 text-center">
      <BarChart3 className="mx-auto h-24 w-24 text-orange-500 mb-6" />
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Statistiques Détaillées</h1>
      <p className="text-lg text-gray-600 mb-8">
        Explorez vos chiffres d'écoute détaillés, vos artistes et titres les plus écoutés, et bien plus encore.
      </p>
      <p className="text-muted-foreground">Fonctionnalité en cours de développement.</p>
    </div>
  )
}
