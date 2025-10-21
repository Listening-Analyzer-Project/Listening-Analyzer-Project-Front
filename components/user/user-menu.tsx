// app/components/user/user-menu.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import ConfirmDeleteDialog from "./confirm-delete-dialog";
import UserSheet from "./user-dialog";

type AppUser = {
  id: number;
  name: string;
  type: number;
  isadmin: boolean;
  syncro_status: number;
};

/**
 * Palette + utilitaires couleur
 * - baseColors : couleurs de base (distinctes)
 * - getColorForIndex : renvoie une couleur HSL dérivée (variation de luminosité)
 */
const baseColors = [
  "#059669", // green
  "#0EA5E9", // sky
  "#7C3AED", // violet
  "#F97316", // orange
  "#EF4444", // red
  "#2563EB", // blue
  "#D97706", // amber
  "#10B981", // emerald
];

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToCss(h: number, s: number, l: number) {
  return `hsl(${h} ${s}% ${l}%)`;
}

/**
 * Return a distinct color per index by:
 * - choosing a base color by index % baseColors.length
 * - adjusting lightness depending on bucket (index / baseColors.length)
 */
function getColorForIndex(index: number) {
  const base = baseColors[index % baseColors.length];
  const bucket = Math.floor(index / baseColors.length); // 0,1,2...
  const { h, s, l } = hexToHsl(base);
  // modify lightness a bit per bucket (cap between 30 and 70)
  const delta = bucket * 8; // each loop increases/decreases lightness
  let newL = l - (bucket % 2 === 0 ? -delta : delta); // alternate lighten/darken
  if (newL < 28) newL = 28;
  if (newL > 78) newL = 78;
  return hslToCss(h, s, newL);
}

export default function UserMenu({
  onSelect,
}: {
  onSelect?: (u: AppUser) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<AppUser> | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // controlled dropdown menu: holds the id of the opened menu (or null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // delete confirm dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<number | null>(null);

  // fetch users from Supabase **in creation order** (oldest first)
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // order ascending to get oldest (creation order) first
      const { data, error } = await supabase
        .from("user")
        .select("*")
        .order("id", { ascending: true });
      if (error) throw error;
      setUsers((data as AppUser[]) ?? []);
      if (!selectedId && data && data.length > 0)
        setSelectedId((data as AppUser[])[0].id);
    } catch (err) {
      console.error("fetchUsers error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initials = (name: string) =>
    name
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  // create or update
  const handleSave = async (payload: Partial<AppUser> & { id?: number }) => {
    try {
      if (payload.id) {
        const { error } = await supabase
          .from("user")
          .update({
            name: payload.name,
            type: payload.type,
            isadmin: payload.isadmin,
            syncro_status: payload.syncro_status,
          })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user").insert([
          {
            name: payload.name,
            type: payload.type ?? 0,
            isadmin: payload.isadmin ?? false,
            syncro_status: payload.syncro_status ?? 0,
          },
        ]);
        if (error) throw error;
      }
      await fetchUsers();
      setSheetOpen(false);
      setEditing(null);
    } catch (err) {
      console.error("save user error", err);
      alert("Erreur lors de la sauvegarde — voir console.");
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    try {
      const { error } = await supabase.from("user").delete().eq("id", id);
      if (error) throw error;
      await fetchUsers();
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      console.error("delete user error", err);
      alert("Erreur lors de la suppression — voir console.");
    }
  };

  return (
    <>
      {/* avatar trigger */}
      <div className="flex items-center">
        {/** compute selected user and its index so we can derive its color */}
        {(() => {
          const selectedUser = users.find((u) => u.id === selectedId) ?? null;
          const selectedIndex = selectedUser
            ? users.findIndex((u) => u.id === selectedId)
            : -1;
          const avatarBg =
            selectedIndex >= 0 ? getColorForIndex(selectedIndex) : "#64748b";
          const avatarInitials = selectedUser
            ? initials(selectedUser.name)
            : "U";
          return (
            <button
              onClick={() => setDrawerOpen(true)}
              className="h-10 w-10 rounded-full inline-flex items-center justify-center font-semibold text-white shadow-sm"
              aria-label="Open users menu"
              style={{ background: avatarBg }}
            >
              {avatarInitials}
            </button>
          );
        })()}
      </div>

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow transform transition-transform duration-200 flex flex-col ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Utilisateurs</h3>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1 rounded hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* Scrollable list area
            - pt = top padding
            - we add a spacer div BEFORE the footer so top and bottom spacing visually match
        */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
          {loading ? (
            <div>Chargement...</div>
          ) : users.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Aucun utilisateur trouvé.
            </div>
          ) : (
            <ul className="space-y-2">
              {users.map((u, idx) => {
                const color = getColorForIndex(idx);
                return (
                  <li
                    key={u.id}
                    className={`flex items-center justify-between gap-3 rounded p-2 cursor-pointer ${
                      selectedId === u.id ? "bg-green-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className="flex items-center gap-3"
                      onClick={() => {
                        setSelectedId(u.id);
                        onSelect?.(u);
                      }}
                    >
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-white shrink-0"
                        style={{ background: color }}
                      >
                        {initials(u.name)}
                      </div>

                      <div>
                        <div className="text-sm font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">
                          type: {u.type} {u.isadmin ? " · admin" : ""}
                        </div>
                      </div>
                    </div>

                    {/* Dropdown actions (controlled per item) */}
                    <div>
                      <DropdownMenu
                        open={openMenuId === u.id}
                        onOpenChange={(v) =>
                          v ? setOpenMenuId(u.id) : setOpenMenuId(null)
                        }
                      >
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-gray-100"
                            aria-label="User actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditing(u);
                              setSheetOpen(true);
                              setOpenMenuId(null); // close menu
                            }}
                          >
                            Modifier
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setToDeleteId(u.id);
                              setDeleteDialogOpen(true);
                              setOpenMenuId(null); // close menu immediately
                            }}
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* spacer so the last item visually has same gap as top (and is not hidden behind footer) */}
          <div className="h-16" />
        </div>

        {/* Footer fixed at bottom */}
        <div className="absolute bottom-0 left-0 w-full border-t bg-white p-4">
          <button
            onClick={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
            className="w-full rounded-md bg-green-600 text-white py-2 text-sm font-medium hover:bg-green-700"
          >
            + Créer un utilisateur
          </button>
        </div>
      </div>

      {/* Backdrop */}
      <div
        onClick={() => setDrawerOpen(false)}
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity ${
          drawerOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Delete confirmation */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(v) => {
          setDeleteDialogOpen(v);
          // ensure dropdown is closed when dialog closed/cancelled
          if (!v) setOpenMenuId(null);
          if (!v) setToDeleteId(null);
        }}
        onConfirm={async () => {
          if (!toDeleteId) return;
          await handleDelete(toDeleteId);
          setToDeleteId(null);
        }}
      />

      {/* Sheet (create/edit user) */}
      <UserSheet
        open={sheetOpen}
        onOpenChange={(v) => {
          setSheetOpen(v);
          if (!v) setEditing(null);
        }}
        defaultValues={editing ?? undefined}
        onSave={handleSave}
      />
    </>
  );
}
