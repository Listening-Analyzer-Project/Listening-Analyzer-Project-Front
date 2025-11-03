import { useEffect, useRef, useState } from 'react'

export function useApi<T>(factory: (signal?: AbortSignal) => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const execute = async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const result = await factory(controller.signal)
      if (!controller.signal.aborted) setData(result as T)
    } catch (err) {
      if ((err as any)?.name !== 'AbortError') setError(err)
    } finally {
      if (!controllerRef.current?.signal.aborted) setLoading(false)
    }
  }

  useEffect(() => {
    execute()
    return () => {
      controllerRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, refetch: execute } as const
}
