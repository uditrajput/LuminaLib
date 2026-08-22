import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';
import { Button } from '@/components/ui/Button';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';

interface AvatarCropperModalProps {
    imageSrc: string;
    onClose: () => void;
    onComplete: (file: File) => void;
}

export default function AvatarCropperModal({ imageSrc, onClose, onComplete }: AvatarCropperModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        setIsProcessing(true);
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
            if (croppedImage) {
                onComplete(croppedImage);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900 dark:text-white">Crop Profile Picture</h2>
                    <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="relative h-80 w-full bg-slate-900">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>

                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3 text-slate-500">
                        <ZoomOut className="h-4 w-4" />
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-label="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1 h-2 rounded-lg appearance-none bg-slate-200 dark:bg-slate-700 outline-none"
                        />
                        <ZoomIn className="h-4 w-4" />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isProcessing} className="gap-2">
                            {isProcessing ? (
                                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}
                            Save Picture
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
