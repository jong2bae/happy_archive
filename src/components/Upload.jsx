import React, { useState, useEffect } from 'react';
import exifr from 'exifr';
import { loginWithGoogle, observeAuthState } from '../services/auth';
import { uploadImage } from '../services/storage';
import { savePhotoData } from '../services/db';

const Upload = () => {
    const [user, setUser] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        const unsubscribe = observeAuthState((u) => setUser(u));
        return () => unsubscribe();
    }, []);





    const handleLogin = async () => {
        try {
            await loginWithGoogle();
        } catch (e) {
            console.error(e);
        }
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        setStatus(`Uploading ${files.length} items...`);

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setStatus(`Uploading ${i + 1} / ${files.length}: ${file.name} (Extracting Metadata)...`);

                let capturedAt = null;
                let metadata = {};
                try {
                    // Extract all useful EXIF data including GPS
                    // Using ArrayBuffer for better mobile browser compatibility
                    const buffer = await file.arrayBuffer();
                    const output = await exifr.parse(buffer, {
                        pick: ['DateTimeOriginal', 'Make', 'Model', 'ISO', 'FNumber', 'ExposureTime', 'latitude', 'longitude'],
                        translateValues: true,
                        reviveValues: true
                    });

                    if (output) {
                        capturedAt = output.DateTimeOriginal;
                        metadata = {
                            make: output.Make,
                            model: output.Model,
                            iso: output.ISO,
                            fStop: output.FNumber,
                            shutterSpeed: output.ExposureTime,
                            latitude: output.latitude,
                            longitude: output.longitude
                        };
                        // Remove undefined OR NaN values (Firestore doesn't support undefined, and NaN is useless)
                        Object.keys(metadata).forEach(key => {
                            const val = metadata[key];
                            if (val === undefined || val === null || (typeof val === 'number' && isNaN(val))) {
                                delete metadata[key];
                            }
                        });
                    }
                } catch (exifErr) {
                    console.warn(`Could not extract EXIF for ${file.name}`, exifErr);
                }

                setStatus(`Uploading ${i + 1} / ${files.length}: ${file.name} (Sending to Storage)...`);

                // Upload to Storage
                const { url, path } = await uploadImage(file);

                setStatus(`Uploading ${i + 1} / ${files.length}: ${file.name} (Saving to Database)...`);

                // Save Metadata to DB
                await savePhotoData({
                    url,
                    storagePath: path,
                    uploaderUid: user.uid,
                    uploaderName: user.displayName,
                    filename: file.name,
                    capturedAt: capturedAt || new Date(), // Fallback to now if no EXIF
                    ...metadata // Spread extended metadata including GPS (undefined values removed)
                });
            }
            setStatus('Upload complete!');
            e.target.value = null; // Reset input
        } catch (error) {
            console.error(error);
            setStatus('Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <p className="mb-4 text-gray-400">Please sign in to upload photos.</p>
                <button
                    onClick={handleLogin}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-full font-semibold transition"
                >
                    Sign in with Google
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Upload Photos</h2>

            <div className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center hover:bg-white/5 transition flex flex-col items-center justify-center min-h-[200px]">
                {uploading ? (
                    <div className="animate-pulse">{status}</div>
                ) : (
                    <>
                        <p className="mb-4 text-gray-300">Choose images from your device</p>
                        <label className="cursor-pointer px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition">
                            Select Files
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={uploading}
                            />
                        </label>
                    </>
                )}
            </div>
            {status && !uploading && <p className="mt-4 text-center text-green-400">{status}</p>}
        </div>
    );
};

export default Upload;
