'use client';

import { Camera, Download, ExternalLink, X } from 'lucide-react';
import { useState } from 'react';

interface ImageViewerProps {
  imageUrl: string;
  onClose?: () => void;
  title?: string;
  caption?: string;
  source?: 'camera' | 'web' | 'other';
  timestamp?: Date;
}

export default function ImageViewer({
  imageUrl,
  onClose,
  title,
  caption,
  source = 'other',
  timestamp,
}: ImageViewerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `novo-image-${Date.now()}.jpg`;
      link.target = '_blank';
      link.click();
    } catch (error) {
      console.error('Failed to download image:', error);
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    }
  };

  const handleOpenInNewTab = () => {
    window.open(imageUrl, '_blank');
  };

  const getIcon = () => {
    switch (source) {
      case 'camera':
        return <Camera className="w-5 h-5" />;
      case 'web':
        return <ExternalLink className="w-5 h-5" />;
      default:
        return <Camera className="w-5 h-5" />;
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (source) {
      case 'camera':
        return '📸 Picture Captured!';
      case 'web':
        return '🌐 Image from Web';
      default:
        return '🖼️ Image';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500 to-blue-500">
          <div className="flex items-center gap-2 text-white">
            {getIcon()}
            <h3 className="font-semibold">{getTitle()}</h3>
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

        {/* Image Container */}
        <div className="relative bg-gray-100 flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-auto">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
          )}

          {imageError ? (
            <div className="text-center p-8">
              <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Failed to load image</p>
              <p className="text-sm text-gray-400 mt-2">
                The image URL may be invalid or unavailable
              </p>
              <button
                onClick={handleOpenInNewTab}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium inline-flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Try Opening in New Tab
              </button>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={caption || 'Image'}
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
          {caption && <p className="text-sm text-gray-700 mb-3 italic">"{caption}"</p>}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">NoVo</span>
              {timestamp && (
                <>
                  <span className="text-gray-400">•</span>
                  <span>{timestamp.toLocaleTimeString()}</span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOpenInNewTab}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium inline-flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
