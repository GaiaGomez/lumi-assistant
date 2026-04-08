'use client'

import { useEffect } from 'react'

let overlayLockCount = 0
let lockedScrollY = 0
let previousBodyStyles: {
  overflow: string
  position: string
  top: string
  left: string
  right: string
  width: string
  overscrollBehavior: string
} | null = null
let previousHtmlStyles: {
  overflow: string
  overscrollBehavior: string
} | null = null

export default function useBodyScrollLock(isLocked: boolean, className = 'dashboard-overlay-open') {
  useEffect(() => {
    if (!isLocked || typeof window === 'undefined') return

    const body = document.body
    const html = document.documentElement

    overlayLockCount += 1

    if (overlayLockCount === 1) {
      lockedScrollY = window.scrollY
      previousBodyStyles = {
        overflow: body.style.overflow,
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        width: body.style.width,
        overscrollBehavior: body.style.overscrollBehavior,
      }
      previousHtmlStyles = {
        overflow: html.style.overflow,
        overscrollBehavior: html.style.overscrollBehavior,
      }

      body.classList.add(className)
      body.style.overflow = 'hidden'
      body.style.position = 'fixed'
      body.style.top = `-${lockedScrollY}px`
      body.style.left = '0'
      body.style.right = '0'
      body.style.width = '100%'
      body.style.overscrollBehavior = 'none'

      html.style.overflow = 'hidden'
      html.style.overscrollBehavior = 'none'
    } else {
      body.classList.add(className)
    }

    return () => {
      overlayLockCount = Math.max(overlayLockCount - 1, 0)

      if (overlayLockCount > 0) return

      body.classList.remove(className)

      if (previousBodyStyles) {
        body.style.overflow = previousBodyStyles.overflow
        body.style.position = previousBodyStyles.position
        body.style.top = previousBodyStyles.top
        body.style.left = previousBodyStyles.left
        body.style.right = previousBodyStyles.right
        body.style.width = previousBodyStyles.width
        body.style.overscrollBehavior = previousBodyStyles.overscrollBehavior
      }

      if (previousHtmlStyles) {
        html.style.overflow = previousHtmlStyles.overflow
        html.style.overscrollBehavior = previousHtmlStyles.overscrollBehavior
      }

      window.scrollTo(0, lockedScrollY)
    }
  }, [className, isLocked])
}
