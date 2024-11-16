export function scrollTo(top: number): Promise<void> {
  const duration = 150
  return new Promise(function (resolve, reject) {
    try {
      const startTop = window.scrollY
      const scrollDistance = top - startTop
      const beginTime = Date.now()

      const animate = function () {
        const nowTime = Date.now()
        const pastTime = nowTime - beginTime
        window.scrollTo({ top: computeCoordinate(pastTime) })
        if (pastTime < duration) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }

      const computeCoordinate = function (pastTime: number): number {
        let factor = Math.pow(pastTime / duration, 2)
        if (factor > 1) factor = 1
        return startTop + scrollDistance * factor
      }

      requestAnimationFrame(animate)
    } catch (err) {
      reject(err)
    }
  })
}
