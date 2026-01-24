'use client';

import { Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Photo {
  url: string;
  id: string;
}

interface PhotoGridProps {
  photos: Photo[];
  onPhotoDelete: (id: string) => void;
  onClose: () => void;
  onEmailPhotos: (selectedPhotoIds: string[], email: string, name: string) => void;
  defaultEmail?: string;
  defaultName?: string;
  autoOpenEmailModal?: boolean;
}

export default function PhotoGrid({
  photos,
  onPhotoDelete,
  onClose,
  onEmailPhotos,
  defaultEmail,
  defaultName,
  autoOpenEmailModal,
}: PhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedForEmail, setSelectedForEmail] = useState<Set<string>>(
    new Set(photos.map((p) => p.id))
  );
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState(defaultEmail || '');
  const [nameInput, setNameInput] = useState(defaultName || '');
  const hasAutoOpenedRef = useRef(false);

  useEffect(() => {
    if (!autoOpenEmailModal || hasAutoOpenedRef.current) return;
    hasAutoOpenedRef.current = true;
    setShowEmailModal(true);
  }, [autoOpenEmailModal]);

  useEffect(() => {
    if (showEmailModal) {
      setEmailInput(defaultEmail || '');
      setNameInput(defaultName || '');
    }
  }, [showEmailModal, defaultEmail, defaultName]);

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
            {photos.map((photo, index) => (
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
                {/* Photo number badge */}
                <div className="absolute top-2 left-2 bg-blue-600 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center text-sm">
                  {index + 1}
                </div>

                {/* Selection checkbox */}
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedForEmail.has(photo.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      const newSelected = new Set(selectedForEmail);
                      if (e.target.checked) {
                        newSelected.add(photo.id);
                      } else {
                        newSelected.delete(photo.id);
                      }
                      setSelectedForEmail(newSelected);
                    }}
                    className="w-5 h-5 cursor-pointer"
                    aria-label={`Select photo ${index + 1}`}
                  />
                </div>

                {/* Delete button on thumbnail */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePhoto(photo.id);
                    // Also remove from email selection if deleted
                    const newSelected = new Set(selectedForEmail);
                    newSelected.delete(photo.id);
                    setSelectedForEmail(newSelected);
                  }}
                  className="absolute bottom-2 left-2 p-2 bg-red-500/80 hover:bg-red-600 rounded-full transition-colors"
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
              onClick={() => setShowEmailModal(true)}
              disabled={selectedForEmail.size === 0}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Email {selectedForEmail.size} {selectedForEmail.size === 1 ? 'Photo' : 'Photos'}
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

      {/* Email Input Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-300 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Send Photos via Email</h3>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="name-input"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Your Name
                </label>
                <input
                  id="name-input"
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="email-input"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="email-input"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailInput('');
                  setNameInput('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (emailInput.trim() && nameInput.trim()) {
                    // Delete unselected photos
                    photos.forEach((photo) => {
                      if (!selectedForEmail.has(photo.id)) {
                        onPhotoDelete(photo.id);
                      }
                    });
                    // Send email with the provided details
                    onEmailPhotos(
                      Array.from(selectedForEmail),
                      emailInput.trim(),
                      nameInput.trim()
                    );
                    setShowEmailModal(false);
                    setEmailInput('');
                    setNameInput('');
                  }
                }}
                disabled={!emailInput.trim() || !nameInput.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
