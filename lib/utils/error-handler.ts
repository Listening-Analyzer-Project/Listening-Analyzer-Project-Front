import { toast } from "@/lib/utils/use-toast"

// Standardized error toast
export function showErrorToast(error: unknown, fallbackTitle = "Une erreur est survenue") {
  console.log('[showErrorToast] Called with:', { error, fallbackTitle })
  
  let description = "Veuillez réessayer plus tard."

  if (error instanceof Error) {
    description = error.message
  } else if (typeof error === "string") {
    description = error
  }

  console.log('[showErrorToast] Calling toast with:', { title: fallbackTitle, description })

  toast({
    variant: "destructive",
    title: fallbackTitle,
    description: description,
    duration: 5000,
  })
}

// Standardized success toast
export function showSuccessToast(title: string, description?: string) {
  toast({
    variant: "default",
    title: title,
    description: description,
  })
}