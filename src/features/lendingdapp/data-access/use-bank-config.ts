import { useEffect, useState } from "react"

export function useBanksConfig() {
    const [config, setConfig] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
  
    useEffect(() => {
      fetch('/anchor/banks-config.json')
        .then(res => {
          if (res.status === 404) {
            // 404 means banks haven't been set up yet - this is expected, not an error
            setConfig(null)
            setError(null)
            return
          }
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`)
          }
          return res.json()
        })
        .then(data => {
          if (data !== undefined) {
            setConfig(data)
            setError(null)
          }
        })
        .catch(err => {
          console.error('Failed to load banks config:', err)
          setError(err.message)
          setConfig(null)
        })
    }, [])
  
    return { config, error }
  }