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
    const newScale = scale + 0.2
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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
          backgroundColor: 'white',
          borderRadius: '12px',
          width: 'min(920px, 100%)',
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            flexShrink: 0,
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--color-ink)',
              margin: 0,
            }}
          >
            Resume
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Zoom Controls */}
            <button
              onClick={handleZoomOut}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: '#f3f4f6',
                color: 'var(--color-ink)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              title="Zoom out"
            >
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
              style={{
                width: '120px',
                height: '6px',
                borderRadius: '3px',
                background: '#e5e7eb',
                outline: 'none',
                cursor: 'pointer',
              }}
              title="Zoom slider"
            />
            <span
              style={{
                fontSize: '0.875rem',
                minWidth: '45px',
                textAlign: 'center',
                color: 'var(--color-ink-muted)',
              }}
            >
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: '#f3f4f6',
                color: 'var(--color-ink)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={handleResetView}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: '#f3f4f6',
                color: 'var(--color-ink)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              title="Reset view"
            >
              Reset
            </button>

            <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }} />

            <a
              href="/resume/resume.pdf"
              download="resume.pdf"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--color-ink)',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Download
            </a>
            <button
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                color: 'var(--color-ink)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            >
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
            backgroundColor: '#f5f5f5',
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
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
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
              padding: '1rem',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              flexShrink: 0,
            }}
          >
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: currentPage === 1 ? '#e5e7eb' : '#f3f4f6',
                color: 'var(--color-ink)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (currentPage > 1) e.currentTarget.style.backgroundColor = '#e5e7eb'
              }}
              onMouseLeave={(e) => {
                if (currentPage > 1) e.currentTarget.style.backgroundColor = '#f3f4f6'
              }}
            >
              Previous
            </button>
            <span
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-ink-muted)',
              }}
            >
              Page {currentPage} of {numPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === numPages}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: currentPage === numPages ? '#e5e7eb' : '#f3f4f6',
                color: 'var(--color-ink)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: currentPage === numPages ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (currentPage < numPages) e.currentTarget.style.backgroundColor = '#e5e7eb'
              }}
              onMouseLeave={(e) => {
                if (currentPage < numPages) e.currentTarget.style.backgroundColor = '#f3f4f6'
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
