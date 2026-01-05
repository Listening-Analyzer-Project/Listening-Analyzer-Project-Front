import { toast } from "@/lib/utils/toasts/use-toast"

// Standardized error toast
export function showErrorToast(error: unknown, fallbackTitle = "Une erreur est survenue") {
  let description = "Veuillez réessayer plus tard."

  if (error instanceof Error) {
    description = error.message
  } else if (typeof error === "string") {
    description = error
  }

  toast({
    variant: "destructive",
    title: fallbackTitle,
    description: description,
    duration: 5000,
  })
}

// Standardized success toast
export function showSuccessToast(title: string, description?: string, duration = 3000) {
  toast({
    variant: "default",
    title: title,
    description: description,
    duration: duration,
  })
}