'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter, useParams } from 'next/navigation'

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { userService } from '@/lib/api'
import type { FUser } from '@/types'
import UploadArea from './components/upload-area'

export default function UserSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const id = Number(params.id)

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<FUser>()
  const [isEditing, setIsEditing] = useState(false)

  const [activeSection, setActiveSection] =
    useState<'info' | 'upload' | 'sync'>('info')

  const form = useForm<Omit<FUser, 'id'>>({
    defaultValues: {
      name: '',
      type: 0,
      isadmin: 0,
      syncro_status: 0,
    },
  })

  useEffect(() => {
    async function load() {
      try {
        const u = await userService.fetchById(id)
        setUser(u)
        form.reset({
          name: u.name,
          type: u.type,
          isadmin: u.isadmin,
          syncro_status: u.syncro_status,
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleSave(data: Omit<FUser, 'id'>) {
    await userService.update(id, data)
    router.refresh()
  }

  const handleCancel = () => {
    if (!user) return
    form.reset({
      name: user.name,
      type: user.type,
      isadmin: user.isadmin,
      syncro_status: user.syncro_status,
    })
    setIsEditing(false)
  }

  const userType = () => {
    switch (user?.type) {
      case 0:
        return 'Spotify'
      case 1:
        return 'Deezer'    
      default:
        return 'Autre'
    }  
  }

  const userSyncStatus = () => {
    switch (user?.syncro_status) {
        case 0:
            return 'En attente d’upload'
        case 1:
            return 'Synchronisation en cours'
        case 2:
            return 'Synchronisation partielle'
        case 3:
            return 'Synchronisé'
        default:
            return 'Inconnu'
    }
  }

  if (loading || !user) {
    return <div className="p-6">Chargement...</div>
  }

  const syncStatus = form.watch('syncro_status')
  const isAdmin = form.watch('isadmin') === 1

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <aside className="md:col-span-1">
          <div className="sticky top-6 space-y-2">

            <Button
              variant={activeSection === 'info' ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setActiveSection('info')}
            >
              Informations
            </Button>

            <Button
              variant={activeSection === 'upload' ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setActiveSection('upload')}
            >
              Upload fichiers
            </Button>

            <Button
              variant={activeSection === 'sync' ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setActiveSection('sync')}
            >
              Synchronisation
            </Button>

          </div>
        </aside>

        <div className="md:col-span-3 space-y-6">
          {activeSection === 'info' && (
            <Card>
              <CardHeader>
                <CardTitle>Informations utilisateur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nom</Label>
                  <Input {...form.register('name')} disabled={!isEditing} />
                </div>

                 {!isEditing && (
                    <div className="py-2">
                        <Label className="font-medium text-sm">Détails avancés (édition désactivée)</Label>
                        <div className="pl-4 pt-2 border-l space-y-3">       
                            <div>Type: {userType()}</div>
                            <div>Statut de synchronisation: {userSyncStatus()}</div>
                        </div>
                    </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isAdmin}
                    disabled={!isEditing}
                    onChange={e =>
                      form.setValue('isadmin', e.target.checked ? 1 : 0)
                    }
                    className="h-4 w-4"
                  />
                  <Label>Administrateur</Label>
                </div>

                {isAdmin && (
                  <div className="pl-4 border-l space-y-3">
                    <Label className="font-medium text-sm">Options admin</Label>
                    <Input placeholder="Champ admin 1 (à venir)" disabled={!isEditing} />
                    <Input placeholder="Champ admin 2 (à venir)" disabled={!isEditing} />
                  </div>
                )}

              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>Modifier</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleCancel}>
                      Annuler
                    </Button>
                    <Button
                      onClick={form.handleSubmit(async data => {
                        await handleSave(data)
                        setIsEditing(false)
                      })}
                    >
                      Sauvegarder
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          )}

          {activeSection === 'upload' && (
            <Card>
                <CardHeader>
                <CardTitle>Upload fichiers</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        ⚠️ Si vous uploadez de nouveaux fichiers, cela remplacera les fichiers existants pour cet utilisateur.
                    </p>
                    <UploadArea />
                </CardContent>
            </Card>
          )}

          {activeSection === 'sync' && (
            <Card>
              <CardHeader>
                <CardTitle>Synchronisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {syncStatus === 0 && (
                  <p className="text-muted-foreground">
                    En attente d’upload…
                  </p>
                )}
                {syncStatus === 1 && (
                  <p className="text-blue-600">Synchronisation en cours…</p>
                )}
                {syncStatus === 2 && (
                  <>
                    <p className="text-yellow-600">
                      Synchronisation partielle — nouvelle action requise.
                    </p>
                    <Button>Relancer la synchro</Button>
                  </>
                )}
                {syncStatus >= 3 && (
                  <p className="text-green-600">
                    Utilisateur entièrement synchronisé ✔
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}