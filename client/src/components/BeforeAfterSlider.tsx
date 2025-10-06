import { useState, useRef, useCallback, useEffect } from "react"

interface BeforeAfterSliderProps {
  beforeImage: string
  afterImage: string
  beforeLabel?: string
  afterLabel?: string
  className?: string
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Before",
  afterLabel = "After",
  className = ""
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Unified position calculation for both mouse and touch events
  const updateSliderPosition = useCallback((clientX: number) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const percentage = (x / rect.width) * 100
    setSliderPosition(percentage)
  }, [])

  // Mouse event handlers
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    updateSliderPosition(e.clientX)
  }, [isDragging, updateSliderPosition])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  // Touch event handlers
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return
    e.preventDefault() // Prevent scrolling on mobile
    if (e.touches.length > 0) {
      updateSliderPosition(e.touches[0].clientX)
    }
  }, [isDragging, updateSliderPosition])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault() // Prevent scrolling
    setIsDragging(true)
  }, [])

  // Click/tap handler for both mouse and touch
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    
    updateSliderPosition(e.clientX)
  }, [updateSliderPosition])

  const handleTouchTap = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current || e.touches.length === 0) return
    
    updateSliderPosition(e.touches[0].clientX)
  }, [updateSliderPosition])

  // Add event listeners for both mouse and touch
  useEffect(() => {
    if (isDragging) {
      // Mouse events
      document.addEventListener('mousemove', handleMouseMove, { passive: false })
      document.addEventListener('mouseup', handleMouseUp)
      
      // Touch events
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg cursor-pointer select-none touch-none ${className}`}
      onClick={handleClick}
      onTouchStart={handleTouchTap}
      style={{ 
        touchAction: 'none', // Prevent browser default touch behaviors
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
      data-testid="before-after-slider"
    >
      {/* After Image (background) */}
      {afterImage.includes('placeholder_luxury_after') ? (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20"></div>
          <div className="text-center z-10 p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-600 rounded-lg shadow-lg flex items-center justify-center">
              <div className="w-8 h-8 bg-orange-400 rounded"></div>
            </div>
            <h3 className="font-bold text-xl text-gray-800 mb-2">Luxury Living Room</h3>
            <p className="text-gray-600">Staged with Fireplace Feature</p>
            <p className="text-sm text-gray-500 mt-2">Replace with luxury staged living room image</p>
          </div>
        </div>
      ) : (
        <img
          src={afterImage}
          alt={afterLabel}
          className="w-full h-full object-cover"
          draggable={false}
        />
      )}
      
      {/* Before Image (clipped) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        {beforeImage.includes('placeholder_luxury_before') ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
            <div className="text-center z-10 p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-400 rounded-lg shadow-lg flex items-center justify-center">
                <div className="w-8 h-8 bg-gray-500 rounded border-2 border-gray-600"></div>
              </div>
              <h3 className="font-bold text-xl text-gray-700 mb-2">Empty Luxury Living Room</h3>
              <p className="text-gray-600">With Fireplace (Before Staging)</p>
              <p className="text-sm text-gray-500 mt-2">Replace with empty luxury room image</p>
            </div>
          </div>
        ) : (
          <img
            src={beforeImage}
            alt={beforeLabel}
            className="w-full h-full object-cover"
            draggable={false}
          />
        )}
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize touch-none"
        style={{ 
          left: `${sliderPosition}%`, 
          transform: 'translateX(-50%)',
          touchAction: 'none'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        data-testid="slider-handle"
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-8 md:h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-200">
          <div className="w-3 h-3 md:w-2 md:h-2 bg-gray-400 rounded-full"></div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-4 left-4 bg-background/60 backdrop-blur-sm text-muted-foreground px-3 py-1.5 rounded-md text-sm font-medium">
        {beforeLabel}
      </div>
      <div className="absolute bottom-4 right-4 bg-background/60 backdrop-blur-sm text-muted-foreground px-3 py-1.5 rounded-md text-sm font-medium">
        {afterLabel}
      </div>
    </div>
  )
}