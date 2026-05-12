import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, RefreshCw, ZoomIn } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface InteractiveCropperProps {
  imageSrc: string;
  initialCorners: Point[];
  originalWidth: number;
  originalHeight: number;
  onConfirm: (corners: Point[]) => void;
  onCancel: () => void;
}

const InteractiveCropper: React.FC<InteractiveCropperProps> = ({
  imageSrc,
  initialCorners,
  originalWidth,
  originalHeight,
  onConfirm,
  onCancel
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [corners, setCorners] = useState<Point[]>(initialCorners);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isHovering, setIsHovering] = useState<number | null>(null);

  // Resize handler to fit image in container
  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const padding = 40;
    const availableWidth = container.clientWidth - padding * 2;
    const availableHeight = container.clientHeight - padding * 2;

    const scaleW = availableWidth / originalWidth;
    const scaleH = availableHeight / originalHeight;
    const newScale = Math.min(scaleW, scaleH);

    setScale(newScale);
    setCanvasSize({
      width: originalWidth * newScale,
      height: originalHeight * newScale
    });
  }, [originalWidth, originalHeight]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, idx: number) => {
    e.preventDefault();
    setDraggingIdx(idx);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (draggingIdx === null || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;

    // Constrain to image boundaries
    const newX = Math.max(0, Math.min(originalWidth, x));
    const newY = Math.max(0, Math.min(originalHeight, y));

    const newCorners = [...corners];
    newCorners[draggingIdx] = { x: newX, y: newY };
    setCorners(newCorners);
  };

  const handleMouseUp = () => {
    setDraggingIdx(null);
  };

  // Draw the connecting lines
  const renderLines = () => {
    if (corners.length < 4) return null;
    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
        viewBox={`0 0 ${originalWidth} ${originalHeight}`}
      >
        <polygon
          points={corners.map(p => `${p.x},${p.y}`).join(' ')}
          fill="rgba(212, 175, 55, 0.1)"
          stroke="var(--gold-primary)"
          strokeWidth={4 / scale}
          strokeDasharray={`${10 / scale}, ${5 / scale}`}
        />
      </svg>
    );
  };

  // Magnifying Glass
  const renderMagnifier = () => {
    if (draggingIdx === null) return null;
    const point = corners[draggingIdx];
    const size = 150;
    const zoom = 2.5;

    // Position magnifier offset from the cursor
    const magX = point.x * scale + (point.x > originalWidth / 2 ? -size - 40 : 40);
    const magY = point.y * scale - size / 2;

    return (
      <div style={{
        position: 'absolute',
        left: magX,
        top: magY,
        width: size,
        height: size,
        borderRadius: '50%',
        border: '3px solid var(--gold-primary)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        zIndex: 1000,
        pointerEvents: 'none',
        background: '#000'
      }}>
        <img
          src={imageSrc}
          alt="Zoom"
          style={{
            position: 'absolute',
            width: originalWidth * scale * zoom,
            height: originalHeight * scale * zoom,
            left: -point.x * scale * zoom + size / 2,
            top: -point.y * scale * zoom + size / 2,
            maxWidth: 'none'
          }}
        />
        {/* Crosshair */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '20px',
          height: '20px',
          pointerEvents: 'none'
        }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--gold-primary)' }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'var(--gold-primary)' }} />
        </div>
      </div>
    );
  };

  return (
    <div 
      className="cropper-overlay"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(10px)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px'
      }}
    >
      {/* Header */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        maxWidth: '1200px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            padding: '10px', 
            background: 'rgba(212, 175, 55, 0.1)', 
            borderRadius: '10px',
            color: 'var(--gold-primary)'
          }}>
            <ZoomIn size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', letterSpacing: '1px', margin: 0 }}>
              REFINE SCAN BOUNDARIES
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Drag the corners to align with the ID card edges for perfect extraction.
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn-luxury"
            onClick={onCancel}
            style={{ padding: '10px 20px', fontSize: '0.8rem' }}
          >
            <X size={16} /> CANCEL
          </button>
          <button 
            className="btn-gold"
            onClick={() => onConfirm(corners)}
            style={{ padding: '10px 30px', fontSize: '0.8rem' }}
          >
            <Check size={16} /> CONFIRM & PROCESS
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '1200px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '24px',
          border: '1px solid var(--glass-border)',
          overflow: 'hidden'
        }}
      >
        <div style={{ 
          position: 'relative', 
          width: canvasSize.width, 
          height: canvasSize.height,
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
        }}>
          <canvas
            ref={canvasRef}
            width={originalWidth}
            height={originalHeight}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              borderRadius: '4px'
            }}
          />
          {/* Draw Image on Hidden Effect Canvas */}
          <img
            src={imageSrc}
            alt="Source"
            style={{ display: 'none' }}
            onLoad={(e) => {
              const ctx = canvasRef.current?.getContext('2d');
              if (ctx) {
                ctx.drawImage(e.currentTarget, 0, 0);
              }
            }}
          />

          {renderLines()}
          {renderMagnifier()}

          {/* Draggable Handles */}
          {corners.map((p, idx) => (
            <div
              key={idx}
              onMouseDown={(e) => handleMouseDown(e, idx)}
              onTouchStart={(e) => handleMouseDown(e, idx)}
              onMouseEnter={() => setIsHovering(idx)}
              onMouseLeave={() => setIsHovering(null)}
              style={{
                position: 'absolute',
                left: p.x * scale,
                top: p.y * scale,
                width: '32px',
                height: '32px',
                transform: 'translate(-50%, -50%)',
                cursor: 'move',
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div style={{
                width: isHovering === idx || draggingIdx === idx ? '20px' : '12px',
                height: isHovering === idx || draggingIdx === idx ? '20px' : '12px',
                borderRadius: '50%',
                background: 'var(--gold-primary)',
                border: '2px solid #fff',
                boxShadow: '0 0 15px rgba(212, 175, 55, 0.5)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>
          ))}
        </div>

        {/* Floating Instruction */}
        <div style={{
          position: 'absolute',
          bottom: '30px',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
          padding: '12px 24px',
          borderRadius: '30px',
          border: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <RefreshCw size={14} className="spin-slow" color="var(--gold-primary)" />
          <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>
            Precision Mode Active: Corner detection completed.
          </span>
        </div>
      </div>
    </div>
  );
};

export default InteractiveCropper;
