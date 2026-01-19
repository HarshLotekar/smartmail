import { useState, useEffect, useCallback } from 'react'
import { apiHelpers } from '../services/api'

/**
 * Custom hook for fetching data from API
 * Provides loading, error, and data states
 */
export const useFetch = (apiFunction, dependencies = [], options = {}) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const {
    immediate = true,
    onSuccess,
    onError,
    transform
  } = options

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiFunction(...args)
      let responseData = response.data

      // Transform data if transformer function provided
      if (transform && typeof transform === 'function') {
        responseData = transform(responseData)
      }

      setData(responseData)

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(responseData)
      }

      return responseData
    } catch (err) {
      const errorInfo = apiHelpers.handleError(err)
      setError(errorInfo.error)

      // Call error callback if provided
      if (onError) {
        onError(errorInfo)
      }

      throw errorInfo
    } finally {
      setLoading(false)
    }
  }, [apiFunction, transform, onSuccess, onError])

  // Auto-execute on mount and dependency changes
  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate, ...dependencies])

  // Manual refresh function
  const refresh = useCallback(() => {
    return execute()
  }, [execute])

  return {
    data,
    loading,
    error,
    execute,
    refresh,
    isLoading: loading,
    hasError: !!error
  }
}

/**
 * Hook for paginated data fetching
 */
export const usePaginatedFetch = (apiFunction, initialParams = {}) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [params, setParams] = useState(initialParams)

  const loadPage = useCallback(async (pageNum = 1, reset = false) => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiFunction({
        ...params,
        page: pageNum,
        limit: 20 // Default items per page
      })

      const newData = response.data.data || response.data
      const hasMoreItems = response.data.hasMore ?? newData.length === 20

      if (reset) {
        setData(newData)
      } else {
        setData(prev => [...prev, ...newData])
      }

      setHasMore(hasMoreItems)
      setPage(pageNum)
    } catch (err) {
      const errorInfo = apiHelpers.handleError(err)
      setError(errorInfo.error)
    } finally {
      setLoading(false)
    }
  }, [apiFunction, params])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadPage(page + 1, false)
    }
  }, [loadPage, page, loading, hasMore])

  const refresh = useCallback(() => {
    setData([])
    setPage(1)
    setHasMore(true)
    loadPage(1, true)
  }, [loadPage])

  const updateParams = useCallback((newParams) => {
    setParams(newParams)
    setData([])
    setPage(1)
    setHasMore(true)
  }, [])

  // Initial load
  useEffect(() => {
    loadPage(1, true)
  }, [params])

  return {
    data,
    loading,
    error,
    hasMore,
    page,
    params,
    loadMore,
    refresh,
    updateParams,
    setParams: updateParams
  }
}

/**
 * Hook for debounced API calls (useful for search)
 */
export const useDebouncedFetch = (apiFunction, delay = 500) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = useCallback(
    debounce(async (...args) => {
      try {
        setLoading(true)
        setError(null)

        const response = await apiFunction(...args)
        setData(response.data)
      } catch (err) {
        const errorInfo = apiHelpers.handleError(err)
        setError(errorInfo.error)
      } finally {
        setLoading(false)
      }
    }, delay),
    [apiFunction, delay]
  )

  return {
    data,
    loading,
    error,
    execute
  }
}

/**
 * Simple debounce utility function
 */
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}