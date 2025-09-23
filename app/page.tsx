import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart, LineChart, Palette, Upload } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
          Analyseur de données Deezer
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Uploadez vos données d'écoute Deezer et découvrez vos habitudes
          musicales avec des visualisations interactives et des analyses
          détaillées.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-col items-center text-center">
            <Upload className="h-12 w-12 text-green-500 mb-4" />
            <CardTitle className="text-2xl font-bold">Upload</CardTitle>
            <CardDescription className="text-gray-500">
              Importez vos fichiers JSON Spotify
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button
              asChild
              className="bg-gray-900 text-white hover:bg-gray-700"
            >
              <Link href="/upload">Commencer</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-col items-center text-center">
            <Palette className="h-12 w-12 text-purple-500 mb-4" />
            <CardTitle className="text-2xl font-bold">Update</CardTitle>
            <CardDescription className="text-gray-500">
              Réécrivez certaines données
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button
              asChild
              variant="outline"
              className="border-purple-500 text-purple-500 hover:bg-purple-50 bg-transparent"
            >
              <Link href="/update">Gérer</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-col items-center text-center">
            <LineChart className="h-12 w-12 text-purple-600 mb-4" />
            <CardTitle className="text-2xl font-bold">Analytics</CardTitle>
            <CardDescription className="text-gray-500">
              Tracez des graphs plus précis
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button
              asChild
              variant="outline"
              className="border-green-500 text-green-500 hover:bg-green-50 bg-transparent"
            >
              <Link href="/graphs">Analyser</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-col items-center text-center">
            <BarChart className="h-12 w-12 text-orange-500 mb-4" />
            <CardTitle className="text-2xl font-bold">Statistiques</CardTitle>
            <CardDescription className="text-gray-500">
              Vos chiffres d'écoute détaillés
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button
              asChild
              variant="outline"
              className="border-orange-500 text-orange-500 hover:bg-orange-50 bg-transparent"
            >
              <Link href="/stats">Voir</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white shadow-lg p-8">
        <CardTitle className="text-3xl font-bold mb-6">
          Comment ça marche ?
        </CardTitle>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100 text-green-600 font-bold text-lg flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Uploadez vos données
              </h3>
              <p className="text-gray-600">
                Importez les fichiers JSON que vous avez reçus de Spotify
                (jusqu'à 9 fichiers)
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600 font-bold text-lg flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Assignez des styles musicaux
              </h3>
              <p className="text-gray-600">
                Catégorisez vos artistes par style musical pour des analyses
                plus poussées
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-purple-100 text-purple-600 font-bold text-lg flex-shrink-0">
              3
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Explorez vos données
              </h3>
              <p className="text-gray-600">
                Visualisez vos habitudes d'écoute avec des graphiques
                interactifs et des comparaisons
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
