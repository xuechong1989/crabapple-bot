import { useState, useEffect, useCallback } from 'react'
import type { BillingInfo } from '@x/shared/dist/billing.js'

export function useBilling(isCrabappleConnected: boolean) {
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchBilling = useCallback(async () => {
    if (!isCrabappleConnected) {
      setBilling(null)
      return
    }
    try {
      setIsLoading(true)
      const result = await window.ipc.invoke('billing:getInfo', null)
      setBilling(result)
    } catch (error) {
      console.error('Failed to fetch billing info:', error)
      setBilling(null)
    } finally {
      setIsLoading(false)
    }
  }, [isCrabappleConnected])

  useEffect(() => {
    fetchBilling()
  }, [fetchBilling])

  return { billing, isLoading, refresh: fetchBilling }
}
