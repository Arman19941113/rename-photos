import { scrollTo } from '@/utils'
import { useLayoutEffect, useRef, useState } from 'react'

export function useFullPage({ maxPage }: { maxPage: number }) {
  const [page, setPage] = useState(0)
  const isScrolling = useRef(false)
  const wheelTime = useRef(0)

  useLayoutEffect(() => {
    const scrollToPage = () => {
      const newScrollTop = window.innerHeight * page
      if (window.scrollY === newScrollTop) return
      isScrolling.current = true
      scrollTo(newScrollTop).then(() => {
        isScrolling.current = false
      })
    }
    scrollToPage()

    const scrollDown = () => {
      if (page === maxPage) return
      setPage(page + 1)
    }

    const scrollUp = () => {
      if (page === 0) return
      setPage(page - 1)
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        scrollDown()
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        scrollUp()
      }
    }

    const handleWheel = (ev: WheelEvent) => {
      ev.preventDefault()
      // avoid continuous wheel
      if (Math.abs(ev.deltaY) < 4) return
      const lastTime = wheelTime.current
      const newTime = Date.now()
      wheelTime.current = newTime
      if (newTime - lastTime < 50) return
      // avoid scrolling conflicts
      if (isScrolling.current) return

      if (ev.deltaY > 0) {
        scrollDown()
      } else {
        scrollUp()
      }
    }

    const handleResize = () => {
      const newScrollTop = window.innerHeight * page
      window.scrollTo({ top: newScrollTop })
    }

    document.addEventListener('keydown', handleKeydown)
    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('resize', handleResize)

    return () => {
      document.removeEventListener('keydown', handleKeydown)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('resize', handleResize)
    }
  }, [page, maxPage])

  return { page, setPage }
}
