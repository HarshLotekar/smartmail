import { useEffect, useCallback } from 'react'

/**
 * Custom hook for keyboard shortcuts
 */
export const useHotkeys = (hotkeys) => {
  const handleKeyDown = useCallback((event) => {
    const key = event.key.toLowerCase()
    const combo = []

    if (event.ctrlKey || event.metaKey) combo.push('ctrl')
    if (event.shiftKey) combo.push('shift')
    if (event.altKey) combo.push('alt')
    combo.push(key)

    const hotkeyString = combo.join('+')

    // Find matching hotkey
    const matchingHotkey = Object.keys(hotkeys).find(hotkey => {
      const normalizedHotkey = hotkey.toLowerCase().replace(/cmd/g, 'ctrl')
      return normalizedHotkey === hotkeyString
    })

    if (matchingHotkey && hotkeys[matchingHotkey]) {
      event.preventDefault()
      event.stopPropagation()
      hotkeys[matchingHotkey](event)
    }
  }, [hotkeys])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Predefined hotkey combinations for SmartMail
 */
export const useSmartMailHotkeys = (handlers = {}) => {
  const defaultHotkeys = {
    // Navigation
    'ctrl+1': handlers.goToInbox || (() => {}),
    'ctrl+2': handlers.goToSent || (() => {}),
    'ctrl+3': handlers.goToDrafts || (() => {}),
    
    // Email actions
    'r': handlers.reply || (() => {}),
    'a': handlers.replyAll || (() => {}),
    'f': handlers.forward || (() => {}),
    'd': handlers.delete || (() => {}),
    'u': handlers.markUnread || (() => {}),
    's': handlers.star || (() => {}),
    
    // UI actions
    'ctrl+k': handlers.openSearch || (() => {}),
    'ctrl+n': handlers.compose || (() => {}),
    'ctrl+r': handlers.refresh || (() => {}),
    'escape': handlers.close || (() => {}),
    
    // AI actions
    'ctrl+shift+a': handlers.analyzeEmail || (() => {}),
    'ctrl+shift+r': handlers.generateReply || (() => {}),
    
    // Navigation arrows
    'arrowup': handlers.previousEmail || (() => {}),
    'arrowdown': handlers.nextEmail || (() => {}),
    'enter': handlers.openEmail || (() => {}),
    'backspace': handlers.goBack || (() => {})
  }

  useHotkeys(defaultHotkeys)

  return defaultHotkeys
}

/**
 * Hook for modal/dialog hotkeys
 */
export const useModalHotkeys = (isOpen, onClose) => {
  useHotkeys({
    'escape': isOpen ? onClose : () => {}
  })
}

/**
 * Hook for form hotkeys
 */
export const useFormHotkeys = (handlers = {}) => {
  const formHotkeys = {
    'ctrl+enter': handlers.submit || (() => {}),
    'ctrl+s': handlers.save || (() => {}),
    'escape': handlers.cancel || (() => {})
  }

  useHotkeys(formHotkeys)

  return formHotkeys
}