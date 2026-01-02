import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Undo, PenTool } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface SignatureCanvasProps {
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  className?: string;
  onChange?: (hasSignature: boolean) => void;
}

export interface SignatureCanvasRef {
  clear: () => void;
  getSignatureData: () => string | null;
  isEmpty: () => boolean;
}

export const SignatureCanvas = forwardRef<SignatureCanvasRef, SignatureCanvasProps>(
  ({ width = 500, height = 200, strokeColor = '#1f2937', strokeWidth = 2, className = '', onChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPoint, setLastPoint] = useState<Point | null>(null);
    const [history, setHistory] = useState<ImageData[]>([]);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      // Set initial styles
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw signature line
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, canvas.height - 40);
      ctx.lineTo(canvas.width - 20, canvas.height - 40);
      ctx.stroke();

      // Add "Sign here" text
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px sans-serif';
      ctx.fillText('Sign here', 20, canvas.height - 20);

      // Reset stroke style
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
    }, [strokeColor, strokeWidth]);

    const getPointFromEvent = (e: React.MouseEvent | React.TouchEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ('touches' in e) {
        const touch = e.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const saveState = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory(prev => [...prev.slice(-10), imageData]); // Keep last 10 states
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      saveState();
      const point = getPointFromEvent(e);
      setIsDrawing(true);
      setLastPoint(point);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawing || !lastPoint) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const point = getPointFromEvent(e);

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      setLastPoint(point);
      
      if (!hasSignature) {
        setHasSignature(true);
        onChange?.(true);
      }
    };

    const stopDrawing = () => {
      setIsDrawing(false);
      setLastPoint(null);
    };

    const clear = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      // Clear and redraw background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Redraw signature line
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, canvas.height - 40);
      ctx.lineTo(canvas.width - 20, canvas.height - 40);
      ctx.stroke();

      // Add "Sign here" text
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px sans-serif';
      ctx.fillText('Sign here', 20, canvas.height - 20);

      // Reset stroke style
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;

      setHistory([]);
      setHasSignature(false);
      onChange?.(false);
    };

    const undo = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || history.length === 0) return;

      const previousState = history[history.length - 1];
      ctx.putImageData(previousState, 0, 0);
      setHistory(prev => prev.slice(0, -1));

      if (history.length <= 1) {
        setHasSignature(false);
        onChange?.(false);
      }
    };

    const getSignatureData = (): string | null => {
      const canvas = canvasRef.current;
      if (!canvas || !hasSignature) return null;
      return canvas.toDataURL('image/png');
    };

    const isEmpty = (): boolean => !hasSignature;

    useImperativeHandle(ref, () => ({
      clear,
      getSignatureData,
      isEmpty,
    }));

    return (
      <div className={`space-y-3 ${className}`}>
        <div className="relative border-2 border-dashed rounded-lg overflow-hidden bg-background">
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: `${height}px`, touchAction: 'none' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="cursor-crosshair"
          />
          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-muted-foreground flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                <span>Draw your signature above</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={undo} disabled={history.length === 0}>
            <Undo className="h-4 w-4 mr-1" />
            Undo
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={clear}>
            <Eraser className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>
    );
  }
);

SignatureCanvas.displayName = 'SignatureCanvas';
