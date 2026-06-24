import { useState, useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/pdf'

interface ResumeModalProps {
  isOpen: boolean
  onClose: () => void
}

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

const DEFAULT_SCALE = 1.3

const btnStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  backgroundColor: 'var(--color-bg-elev-2)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  fontSize: '0.85rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color 0.2s, border-color 0.2s',
}

export default function ResumeModal({ isOpen, onClose }: ResumeModalProps) {
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(DEFAULT_SCALE)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })

  useEffect(() => {
    if (!isOpen) return

    const loadPdf = async () => {
      try {
        const pdf = await pdfjsLib.getDocument('/resume/resume.pdf').promise
        pdfRef.current = pdf
        setNumPages(pdf.numPages)
        setCurrentPage(1)
        renderPage(1, pdf, scale)
      } catch (error) {
        console.error('Error loading PDF:', error)
      }
    }

    loadPdf()
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const renderPage = async (
    pageNum: number,
    pdf: PDFDocumentProxy | null = pdfRef.current,
    scaleValue: number = scale
  ) => {
    if (!pdf || !canvasRef.current) return

    try {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: scaleValue })

      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) return

      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise
    } catch (error) {
      console.error('Error rendering page:', error)
    }
  }

  const handleZoomIn = () => {
    const newScale = Math.min(3, scale + 0.2)
    setScale(newScale)
    renderPage(currentPage, pdfRef.current, newScale)
  }

  const handleZoomOut = () => {
    const newScale = Math.max(0.5, scale - 0.2)
    setScale(newScale)
    renderPage(currentPage, pdfRef.current, newScale)
  }

  const handleNextPage = () => {
    if (currentPage < numPages) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      renderPage(newPage, pdfRef.current, scale)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      renderPage(newPage, pdfRef.current, scale)
    }
  }

  const handleResetView = async () => {
    setScale(DEFAULT_SCALE)
    await renderPage(currentPage, pdfRef.current, DEFAULT_SCALE)

    if (!viewerRef.current) return
    viewerRef.current.scrollTop = 0
    const maxLeft = viewerRef.current.scrollWidth - viewerRef.current.clientWidth
    viewerRef.current.scrollLeft = maxLeft > 0 ? maxLeft / 2 : 0
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!viewerRef.current) return
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: viewerRef.current.scrollLeft,
      scrollTop: viewerRef.current.scrollTop,
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !viewerRef.current) return

    const deltaX = e.clientX - dragStartRef.current.x
    const deltaY = e.clientY - dragStartRef.current.y

    viewerRef.current.scrollLeft = dragStartRef.current.scrollLeft - deltaX
    viewerRef.current.scrollTop = dragStartRef.current.scrollTop - deltaY
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Resume viewer"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-elev)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          width: 'min(920px, 100%)',
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.15rem',
              fontWeight: 600,
              color: 'var(--color-text)',
              margin: 0,
            }}
          >
            Resume
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleZoomOut} style={btnStyle} title="Zoom out" aria-label="Zoom out">
              −
            </button>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={scale}
              onChange={(e) => {
                const newScale = parseFloat(e.currentTarget.value)
                setScale(newScale)
                renderPage(currentPage, pdfRef.current, newScale)
              }}
              style={{ width: '110px', cursor: 'pointer', accentColor: 'var(--color-accent)' }}
              title="Zoom slider"
              aria-label="Zoom level"
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                minWidth: '44px',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
              }}
            >
              {Math.round(scale * 100)}%
            </span>
            <button onClick={handleZoomIn} style={btnStyle} title="Zoom in" aria-label="Zoom in">
              +
            </button>
            <button
              onClick={handleResetView}
              style={{ ...btnStyle, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}
              title="Reset view"
            >
              Reset
            </button>

            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)' }} />

            <a
              href="/resume/resume.pdf"
              download="Zach-Brewer-Resume.pdf"
              style={{
                padding: '0.5rem 1rem',
                background: 'linear-gradient(120deg, var(--color-accent), var(--color-accent-bright))',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Download
            </a>
            <button onClick={onClose} style={btnStyle} aria-label="Close resume viewer">
              Close
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div
          ref={viewerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            backgroundColor: 'var(--color-bg)',
            padding: '1rem',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              width: 'max-content',
              minWidth: '100%',
              minHeight: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                backgroundColor: 'white',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
                borderRadius: '4px',
                display: 'block',
                flexShrink: 0,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        {numPages > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.9rem 1.25rem',
              borderTop: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-elev-2)',
              flexShrink: 0,
            }}
          >
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              style={{ ...btnStyle, opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Page {currentPage} of {numPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === numPages}
              style={{ ...btnStyle, opacity: currentPage === numPages ? 0.4 : 1, cursor: currentPage === numPages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
