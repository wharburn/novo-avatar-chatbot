'use client';

import { Camera, X } from 'lucide-react';
import { useState } from 'react';

interface CapturedPhotoProps {
  imageUrl: string;
  onClose?: () => void;
  timestamp?: Date;
}

export default function CapturedPhoto({ imageUrl, onClose, timestamp }: CapturedPhotoProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500 to-blue-500">
          <div className="flex items-center gap-2 text-white">
            <Camera className="w-5 h-5" />
            <h3 className="font-semibold">📸 Picture Captured!</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/20 transition-colors text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Image */}
        <div className="relative bg-gray-100 flex items-center justify-center min-h-[300px] max-h-[60vh]">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
          )}

          {imageError ? (
            <div className="text-center p-8">
              <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Failed to load image</p>
              <p className="text-sm text-gray-400 mt-2">The image URL may be invalid</p>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt="Captured photo"
              className={`max-w-full max-h-[60vh] object-contain transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">NoVo</span>
              <span className="text-gray-400">•</span>
              <span>{timestamp ? timestamp.toLocaleTimeString() : 'Just now'}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Download image
                  const link = document.createElement('a');
                  link.href = imageUrl;
                  link.download = `novo-photo-${Date.now()}.jpg`;
                  link.click();
                }}
                className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

