import { LineChart } from "lucide-react"

export default function GraphsPage() {
  return (
    <div className="container mx-auto py-8 text-center">
      <LineChart className="mx-auto h-24 w-24 text-purple-600 mb-6" />
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Page d'Analyse des Données</h1>
      <p className="text-lg text-gray-600 mb-8">
        Tracez des graphiques interactifs pour visualiser vos habitudes d'écoute au fil du temps, par genre, par
        artiste, etc.
      </p>
      <p className="text-muted-foreground">Fonctionnalité en cours de développement.</p>
    </div>
  )
}
