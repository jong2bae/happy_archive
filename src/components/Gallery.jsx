import React, { useEffect, useState, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { getPhotos, deletePhoto } from '../services/db';
import { deleteImage } from '../services/storage';
import { observeAuthState } from '../services/auth'; // We need to check if user is allowed to delete

const Gallery = () => {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortMode, setSortMode] = useState('captured'); // 'captured' | 'uploaded'
    const [viewMode, setViewMode] = useState('compact'); // Default to compact
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [showInfo, setShowInfo] = useState(false); // Toggle for info panel in lightbox
    const [currentUser, setCurrentUser] = useState(null);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState(new Set());
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });
    const [heroPhoto, setHeroPhoto] = useState(null); // For slideshow

    useEffect(() => {
        const unsubscribe = observeAuthState((user) => setCurrentUser(user));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchPhotos = async () => {
            try {
                const data = await getPhotos();
                setPhotos(data);
            } catch (error) {
                console.error("Failed to load photos", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPhotos();
    }, []);

    useEffect(() => {
        if (photos.length > 0 && !heroPhoto) {
            setHeroPhoto(photos[Math.floor(Math.random() * photos.length)]);
        }

        const interval = setInterval(() => {
            if (photos.length > 0) {
                const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
                setHeroPhoto(randomPhoto);
            }
        }, 5000); // 5 seconds interval

        return () => clearInterval(interval);
    }, [photos, heroPhoto]);

    // Core Logic: Group photos by date
    const getGroupedPhotos = () => {
        let sortedPhotos = [...photos];

        // Sort based on selected mode
        if (sortMode === 'uploaded') {
            // Sort by upload date (createdAt)
            sortedPhotos.sort((a, b) => {
                const getSeconds = (p) => p.createdAt?.seconds || 0;
                return getSeconds(b) - getSeconds(a);
            });
        } else {
            // Default: Sort by captured date
            sortedPhotos.sort((a, b) => {
                const getSeconds = (p) => p.capturedAt?.seconds || p.createdAt?.seconds || 0;
                return getSeconds(b) - getSeconds(a);
            });
        }

        const groups = {};
        sortedPhotos.forEach(photo => {
            const dateSecs = sortMode === 'uploaded'
                ? (photo.createdAt?.seconds)
                : (photo.capturedAt?.seconds || photo.createdAt?.seconds);
            const date = dateSecs ? new Date(dateSecs * 1000) : new Date();

            const dateKey = date.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(photo);
        });
        return groups;
    };

    const groupedPhotos = getGroupedPhotos();
    // Flatten keys to keep sorting order consistent with render
    const groupKeys = Object.keys(groupedPhotos);

    // Navigation Logic
    const handleNext = useCallback(() => {
        if (!selectedPhoto) return;
        // Find current index in full sorted list (re-sort to match view)
        const allPhotos = Object.values(groupedPhotos).flat();
        const currentIndex = allPhotos.findIndex(p => p.id === selectedPhoto.id);
        if (currentIndex < allPhotos.length - 1) {
            setSelectedPhoto(allPhotos[currentIndex + 1]);
        }
    }, [selectedPhoto, groupedPhotos]);

    const handlePrev = useCallback(() => {
        if (!selectedPhoto) return;
        const allPhotos = Object.values(groupedPhotos).flat();
        const currentIndex = allPhotos.findIndex(p => p.id === selectedPhoto.id);
        if (currentIndex > 0) {
            setSelectedPhoto(allPhotos[currentIndex - 1]);
        }
    }, [selectedPhoto, groupedPhotos]);

    // Keyboard Listeners
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!selectedPhoto) return;
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') setSelectedPhoto(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedPhoto, handleNext, handlePrev]);

    const handleDownload = async (photo) => {
        try {
            const response = await fetch(photo.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = photo.filename || `photo-${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Download failed", error);
            // Fallback
            window.open(photo.url, '_blank');
        }
    };

    const handleDelete = async (photo) => {
        setConfirmDialog({
            isOpen: true,
            message: '이 사진을 정말 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.',
            onConfirm: async () => {
                try {
                    await deletePhoto(photo.id);
                    if (photo.storagePath) await deleteImage(photo.storagePath);
                    setPhotos(prev => prev.filter(p => p.id !== photo.id));
                    setSelectedPhoto(null);
                    setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
                } catch (error) {
                    console.error("Delete failed", error);
                    alert("삭제 실패. 콘솔을 확인하세요.");
                }
            }
        });
    };

    const togglePhotoSelection = (photoId) => {
        setSelectedPhotos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(photoId)) {
                newSet.delete(photoId);
            } else {
                newSet.add(photoId);
            }
            return newSet;
        });
    };

    const handleBatchDelete = async () => {
        if (selectedPhotos.size === 0) return;

        setConfirmDialog({
            isOpen: true,
            message: `선택한 ${selectedPhotos.size}개의 사진을 정말 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.`,
            onConfirm: async () => {
                try {
                    const photosToDelete = photos.filter(p => selectedPhotos.has(p.id));

                    // Delete from Firestore and Storage
                    for (const photo of photosToDelete) {
                        await deletePhoto(photo.id);
                        if (photo.storagePath) {
                            await deleteImage(photo.storagePath);
                        }
                    }

                    setPhotos(prev => prev.filter(p => !selectedPhotos.has(p.id)));
                    setSelectedPhotos(new Set());
                    setSelectionMode(false);
                    setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
                } catch (error) {
                    console.error("Batch delete failed", error);
                    alert("일부 사진 삭제 실패. 콘솔을 확인하세요.");
                }
            }
        });
    };

    const selectAll = () => {
        const allPhotoIds = new Set(photos.map(p => p.id));
        setSelectedPhotos(allPhotoIds);
    };

    const cancelSelection = () => {
        setSelectedPhotos(new Set());
        setSelectionMode(false);
    };

    if (loading) {
        return <div className="text-center py-20 text-gray-400 animate-pulse">Loading memories...</div>;
    }

    return (
        <div className="bg-neutral-900 min-h-screen">
            {/* Hero Slideshow Section */}
            {heroPhoto && (
                <div className="relative h-[40vh] md:h-[60vh] overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-neutral-900 z-10" />
                    <img
                        src={heroPhoto.url}
                        alt="Featured"
                        className="w-full h-full object-cover transition-all duration-1000 ease-in-out scale-105 group-hover:scale-100"
                        style={{ filter: 'brightness(0.7)' }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 px-4 text-center">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white mb-4 drop-shadow-2xl">
                            Happy Archive
                        </h1>
                        <p className="text-lg md:text-xl text-white/80 font-medium max-w-lg drop-shadow-lg">
                            Keep your precious memories safe and organized.
                        </p>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header / Controls */}
                <div className="flex justify-between items-center mb-8 px-2">
                    {selectionMode ? (
                        <>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={cancelSelection}
                                    className="text-gray-300 hover:text-white transition"
                                >
                                    ✕
                                </button>
                                <h2 className="text-lg font-semibold text-white">
                                    {selectedPhotos.size} Selected
                                </h2>
                            </div>
                            <div className="flex gap-2">
                                {selectedPhotos.size < photos.length && (
                                    <button
                                        onClick={selectAll}
                                        className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition"
                                    >
                                        Select All
                                    </button>
                                )}
                                <button
                                    onClick={handleBatchDelete}
                                    disabled={selectedPhotos.size === 0}
                                    className="px-4 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-red-500/30 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-lg font-semibold text-gray-300">
                                {photos.length} Photos
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectionMode(true)}
                                    className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition"
                                >
                                    Select
                                </button>

                                {/* View Mode Toggle */}
                                <div className="bg-white/10 rounded-lg p-1 flex space-x-1">
                                    <button
                                        onClick={() => setViewMode('large')}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === 'large' ? 'bg-white text-black' : 'text-gray-300 hover:text-white'}`}
                                        title="큰 이미지"
                                    >
                                        ⊞
                                    </button>
                                    <button
                                        onClick={() => setViewMode('compact')}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === 'compact' ? 'bg-white text-black' : 'text-gray-300 hover:text-white'}`}
                                        title="작은 이미지"
                                    >
                                        ⊡
                                    </button>
                                </div>

                                {/* Sort Mode Toggle */}
                                <div className="bg-white/10 rounded-lg p-1 flex space-x-1">
                                    <button
                                        onClick={() => setSortMode('captured')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${sortMode === 'captured' ? 'bg-white text-black' : 'text-gray-300 hover:text-white'}`}
                                    >
                                        촬영날짜
                                    </button>
                                    <button
                                        onClick={() => setSortMode('uploaded')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${sortMode === 'uploaded' ? 'bg-white text-black' : 'text-gray-300 hover:text-white'}`}
                                    >
                                        업로드날짜
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Timeline View */}
                <div className="space-y-12">
                    {groupKeys.map(dateKey => (
                        <div key={dateKey}>
                            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-4 ml-1 sticky top-0 bg-[#111111]/90 backdrop-blur-sm py-2 z-10">
                                {dateKey}
                            </h3>
                            <div className={`grid ${viewMode === 'compact' ? 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'}`}>
                                {groupedPhotos[dateKey].map((photo) => {
                                    const isSelected = selectedPhotos.has(photo.id);
                                    return (
                                        <div
                                            key={photo.id}
                                            className={`aspect-square relative group overflow-hidden rounded-xl bg-gray-800 cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 ${selectionMode ? 'hover:scale-100' : 'hover:scale-[1.02]'} ${isSelected ? 'ring-4 ring-blue-500' : ''}`}
                                            onClick={() => selectionMode ? togglePhotoSelection(photo.id) : setSelectedPhoto(photo)}
                                        >
                                            <img
                                                src={photo.url}
                                                alt="Gallery item"
                                                className="object-cover w-full h-full"
                                                loading="lazy"
                                            />
                                            <div className={`absolute inset-0 transition duration-300 ${isSelected ? 'bg-blue-500/30' : 'bg-black/0 group-hover:bg-black/20'}`} />

                                            {/* Checkbox Overlay */}
                                            {selectionMode && (
                                                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-lg z-10">
                                                    {isSelected && (
                                                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {photos.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500">
                        <div className="text-4xl mb-4">📷</div>
                        <p>No photos yet. Click "Upload" to start.</p>
                    </div>
                )}

                {/* Lightbox Modal */}
                {selectedPhoto && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/98 backdrop-blur-md"
                        onClick={() => setSelectedPhoto(null)}
                    >
                        {/* Navigation Buttons (Left/Right) - Desktop */}
                        <button
                            className="fixed left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white z-[70] hidden md:block transition"
                            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        >
                            ←
                        </button>
                        <button
                            className="fixed right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white z-[70] hidden md:block transition"
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        >
                            →
                        </button>

                        <div
                            className="flex flex-col md:flex-row w-full h-full max-w-screen-2xl mx-auto overflow-hidden shadow-2xl relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Lightbox Controls */}
                            {/* Info Toggle - Top Right (Primary Control) */}
                            <div className="absolute top-4 right-4 z-[80]">
                                <button
                                    onClick={() => setShowInfo(!showInfo)}
                                    className={`p-2.5 rounded-full backdrop-blur-md transition-all shadow-lg ${showInfo ? 'bg-blue-600 text-white' : 'bg-black/50 text-white/80 hover:bg-black/70'}`}
                                    title="Photo Info"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>
                            </div>

                            {/* Image Viewer */}
                            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                                <TransformWrapper
                                    initialScale={1}
                                    minScale={0.5}
                                    maxScale={4}
                                    centerOnInit={true}
                                >
                                    <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                                        <img
                                            src={selectedPhoto.url}
                                            alt="Full size"
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    </TransformComponent>
                                </TransformWrapper>
                            </div>

                            {/* Metadata Sidebar (Responsive & Toggleable) */}
                            <div className={`
                            w-full md:w-80 bg-[#1a1a1a]/95 md:bg-[#1a1a1a] backdrop-blur-xl md:backdrop-blur-none
                            border-t md:border-t-0 md:border-l border-white/10 flex flex-col z-70 shadow-2xl
                            transition-all duration-300 ease-in-out
                            fixed inset-x-0 bottom-0 max-h-[70vh] md:relative md:max-h-full
                            ${showInfo ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:hidden'}
                        `}>
                                <div className="p-6 overflow-y-auto flex-1">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-white uppercase tracking-wider text-sm opacity-60">Photo Info</h3>
                                        </div>
                                        <button
                                            className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-full transition"
                                            onClick={() => {
                                                setSelectedPhoto(null);
                                                setShowInfo(false);
                                            }}
                                            title="Close Gallery"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    <dl className="space-y-6">
                                        <div className="grid grid-cols-1 gap-1">
                                            <dt className="text-xs font-bold text-gray-500 uppercase">Captured</dt>
                                            <dd className="text-base text-gray-100">
                                                {selectedPhoto.capturedAt?.seconds
                                                    ? new Date(selectedPhoto.capturedAt.seconds * 1000).toLocaleString(undefined, {
                                                        dateStyle: 'full', timeStyle: 'short'
                                                    })
                                                    : 'Unknown'}
                                            </dd>
                                        </div>

                                        {selectedPhoto.model && (
                                            <div className="grid grid-cols-1 gap-1">
                                                <dt className="text-xs font-bold text-gray-500 uppercase">Camera</dt>
                                                <dd className="text-sm text-gray-200 flex items-center gap-2">
                                                    📷 {selectedPhoto.make} {selectedPhoto.model}
                                                </dd>
                                                {selectedPhoto.iso && (
                                                    <dd className="text-xs text-gray-400 mt-1">
                                                        ISO {selectedPhoto.iso} • f/{selectedPhoto.fStop} • {selectedPhoto.shutterSpeed >= 1 ? selectedPhoto.shutterSpeed : `1/${Math.round(1 / selectedPhoto.shutterSpeed)}`}s
                                                    </dd>
                                                )}
                                            </div>
                                        )}

                                        {selectedPhoto.latitude && (
                                            <div className="pt-2">
                                                <dt className="text-xs font-bold text-gray-500 uppercase mb-2">Location</dt>
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${selectedPhoto.latitude},${selectedPhoto.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition h-32 relative group"
                                                >
                                                    <iframe
                                                        width="100%"
                                                        height="100%"
                                                        frameBorder="0"
                                                        style={{ border: 0, pointerEvents: 'none' }} // Disable map interaction to treat as button
                                                        src={`https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "")}&q=${selectedPhoto.latitude},${selectedPhoto.longitude}&zoom=14`}
                                                        allowFullScreen
                                                        tabIndex="-1"
                                                    ></iframe>
                                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition" />
                                                </a>
                                            </div>
                                        )}

                                        {selectedPhoto.createdAt && (
                                            <div className="pt-4 border-t border-white/10">
                                                <dt className="text-xs font-bold text-gray-500 uppercase">Uploaded</dt>
                                                <dd className="mt-1 text-sm text-gray-300">
                                                    {new Date(selectedPhoto.createdAt.seconds * 1000).toLocaleString(undefined, {
                                                        dateStyle: 'medium', timeStyle: 'short'
                                                    })}
                                                </dd>
                                            </div>
                                        )}

                                        <div className="pt-4 flex gap-2">
                                            <button
                                                onClick={() => handleDownload(selectedPhoto)}
                                                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition text-sm font-semibold flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                                Download
                                            </button>
                                            {currentUser && currentUser.uid === selectedPhoto.uploaderUid && (
                                                <button
                                                    onClick={() => handleDelete(selectedPhoto)}
                                                    className="flex-1 py-2 px-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition text-sm font-semibold flex items-center justify-center gap-2"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>

                                        <div className="pt-2">
                                            <dt className="text-xs font-bold text-gray-500 uppercase">Details</dt>
                                            <dd className="text-xs text-gray-400 mt-1 break-all">
                                                {selectedPhoto.filename}<br />
                                                By {selectedPhoto.uploaderName}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirmation Dialog Modal */}
                {confirmDialog.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#1a1a1a] border border-white/20 rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-4">삭제 확인</h3>
                            <p className="text-gray-300 mb-8 leading-relaxed">{confirmDialog.message}</p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })}
                                    className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={confirmDialog.onConfirm}
                                    className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Gallery;
