'use client';

import { Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface Photo {
  url: string;
  id: string;
}

interface PhotoGridProps {
  photos: Photo[];
  onPhotoDelete: (id: string) => void;
  onClose: () => void;
  onEmailPhotos: () => void;
}

export default function PhotoGrid({ photos, onPhotoDelete, onClose, onEmailPhotos }: PhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const handleDeletePhoto = (id: string) => {
    onPhotoDelete(id);
    // If the deleted photo was selected, close the enlarged view
    if (selectedPhoto?.id === id) {
      setSelectedPhoto(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
        <h2 className="text-white text-xl font-semibold">
          Photo Session ({photos.length} {photos.length === 1 ? 'photo' : 'photos'})
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Close photo grid"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Photo Grid */}
      {!selectedPhoto ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-800 cursor-pointer group"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.url}
                  alt="Captured photo"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                {/* Delete button on thumbnail */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePhoto(photo.id);
                  }}
                  className="absolute bottom-2 right-2 p-2 bg-red-500/80 hover:bg-red-600 rounded-full transition-colors"
                  aria-label="Delete photo"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onEmailPhotos}
              disabled={photos.length === 0}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Email {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'}
            </button>
          </div>
        </div>
      ) : (
        /* Enlarged Photo View */
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedPhoto.url}
              alt="Enlarged photo"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {/* Delete button on enlarged view */}
            <button
              type="button"
              onClick={() => handleDeletePhoto(selectedPhoto.id)}
              className="absolute bottom-4 right-4 p-3 bg-red-500/80 hover:bg-red-600 rounded-full transition-colors"
              aria-label="Delete photo"
            >
              <Trash2 className="w-6 h-6 text-white" />
            </button>
            {/* Close enlarged view */}
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              aria-label="Close enlarged view"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

