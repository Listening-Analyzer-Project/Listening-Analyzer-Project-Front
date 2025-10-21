// user-dialog.tsx

"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

/**
 * Zod schema matching your "user" table
 */
const userSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  type: z.number().int().min(0).optional().default(0),
  isadmin: z.boolean().optional().default(false),
  syncro_status: z.number().int().min(0).optional().default(0),
});
type UserForm = z.infer<typeof userSchema>;

export default function UserDialog({
  open,
  onOpenChange,
  defaultValues,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: Partial<UserForm>;
  onSave: (payload: UserForm) => Promise<void> | void;
}) {
  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: (defaultValues as any) ?? {
      name: "",
      type: 0,
      isadmin: false,
      syncro_status: 0,
    },
  });

  useEffect(() => {
    form.reset(
      (defaultValues as any) ?? {
        name: "",
        type: 0,
        isadmin: false,
        syncro_status: 0,
      }
    );
  }, [defaultValues, open]);

  const handleSubmit = async (data: UserForm) => {
    try {
      await onSave(data);
      onOpenChange(false);
    } catch (err) {
      console.error("UserDialog save error", err);
      alert("Erreur lors de la sauvegarde (voir console)");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* We don't render DialogTrigger here — parent controls open state */}
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {defaultValues?.id ? "Modifier utilisateur" : "Créer utilisateur"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 py-2"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <label className="text-sm font-medium">Name</label>
                  <FormControl>
                    <Input {...field} placeholder="Prénom Nom" autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <label className="text-sm font-medium">Type</label>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isadmin"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <label className="text-sm font-medium">Is admin</label>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="syncro_status"
              render={({ field }) => (
                <FormItem>
                  <label className="text-sm font-medium">Syncro status</label>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
