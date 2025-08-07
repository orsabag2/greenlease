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

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Set drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    console.log('Canvas initialized with dimensions:', { width, height });
  }, [width, height]);

  // Get mouse/touch coordinates relative to canvas
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Start drawing
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    console.log('Started drawing at:', { x, y });
  };

  // Draw
  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    
    ctx.lineTo(x, y);
    ctx.stroke();
    console.log('Drawing to:', { x, y });
  };

  // Stop drawing
  const handleEnd = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    setHasSignature(true);
    
    // Convert canvas to base64
    const canvas = canvasRef.current;
    if (canvas) {
      const signatureData = canvas.toDataURL('image/png');
      onSignatureChange(signatureData);
      console.log('Signature saved');
    }
  };

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setHasSignature(false);
    onSignatureChange('');
    console.log('Canvas cleared');
  };

  // Test function
  const testCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    console.log('Testing canvas...');
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(100, 100);
    ctx.stroke();
    console.log('Test line drawn');
  };

  return (
    <div className={`signature-container ${className}`}>
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}>
          חתום כאן:
        </p>
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="border-2 border-gray-300 rounded-lg cursor-crosshair bg-white"
            style={{ 
              touchAction: 'none',
              width: `${width}px`,
              height: `${height}px`,
              backgroundColor: '#ffffff'
            }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
          {!hasSignature && (
            <div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400"
              style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
            >
              חתום פה
            </div>
          )}
        </div>
      </div>
      
      <div className="flex gap-2 items-center">
        <button
          onClick={clearCanvas}
          className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
        >
          נקה חתימה
        </button>
        
        <button
          onClick={testCanvas}
          className="px-4 py-2 text-sm bg-blue-200 text-blue-700 rounded-lg hover:bg-blue-300 transition-colors"
          style={{ fontFamily: 'Noto Sans Hebrew, Arial, sans-serif' }}
        >
          בדוק קנבס
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