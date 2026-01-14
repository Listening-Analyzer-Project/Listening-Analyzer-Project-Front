'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import EventTab from './components/event-tab'
import GenreTab from './components/genre-tab'
import TagTab from './components/tag-tab'

export default function MetadataPage() {
  const [activeSection, setActiveSection] = useState<'periods' | 'genres' | 'tags'>('periods')

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Metadata</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <aside className="md:col-span-1">
          <div className="sticky top-6 space-y-2">
            <Button
              variant={activeSection === 'periods' ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setActiveSection('periods')}
            >
              Périodes et évènements
            </Button>
            <Button
              variant={activeSection === 'genres' ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setActiveSection('genres')}
            >
              Genres musicaux
            </Button>
            <Button
              variant={activeSection === 'tags' ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setActiveSection('tags')}
            >
              Tags
            </Button>
          </div>
        </aside>

        <div className="md:col-span-3 space-y-6">
          {activeSection === 'periods' && (
            <EventTab />
          )}

          {activeSection === 'genres' && (
            <GenreTab />
          )}

          {activeSection === 'tags' && (
            <TagTab />
          )}
        </div>
      </div>
    </div>
  )
}
