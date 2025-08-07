'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';

interface SignatureCanvasProps {
  onSignatureChange: (signature: string) => void;
  width?: number;
  height?: number;
  className?: string;
}

const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSignatureChange,
  width = 400,
  height = 200,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);

  const getCoordinates = useCallback((e: MouseEvent | TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, []);

  const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    setLastX(x);
    setLastY(y);
  }, [getCoordinates]);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    setLastX(x);
    setLastY(y);
  }, [isDrawing, lastX, lastY, getCoordinates]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setHasSignature(true);
    
    // Convert canvas to base64
    const canvas = canvasRef.current;
    if (canvas) {
      const signatureData = canvas.toDataURL('image/png');
      onSignatureChange(signatureData);
    }
  }, [onSignatureChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Set drawing style
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch events for mobile
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [startDrawing, draw, stopDrawing, width, height]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange('');
  }, [onSignatureChange]);

  return (
    <div className={`signature-container ${className}`}>
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
          חתום כאן:
        </p>
        <canvas
          ref={canvasRef}
          className="border-2 border-gray-300 rounded-lg cursor-crosshair bg-white"
          style={{ 
            touchAction: 'none',
            width: `${width}px`,
            height: `${height}px`
          }}
        />
      </div>
      
      <div className="flex gap-2 items-center">
        <button
          onClick={clearCanvas}
          className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
        >
          נקה חתימה
        </button>
        
        {hasSignature && (
          <div className="flex items-center gap-2 text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
              חתימה נרשמה
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignatureCanvas; 