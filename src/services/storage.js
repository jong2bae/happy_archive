import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid'; // Need to install uuid or just use time

export const deleteImage = async (path) => {
    try {
        const fileRef = ref(storage, path);
        await deleteObject(fileRef);
    } catch (error) {
        console.error("Error deleting file from storage:", error);
        throw error;
    }
};

export const uploadImage = async (file) => {
    console.log("Starting upload for:", file.name);
    try {
        // Basic upload logic
        const fileRef = ref(storage, `images/${Date.now()}_${file.name}`);
        console.log("Created file ref:", fileRef.fullPath);

        // Upload
        console.log("Calling uploadBytes...");
        const snapshot = await uploadBytes(fileRef, file);
        console.log("UploadBytes finished. Snapshot:", snapshot);

        // Get URL
        console.log("Getting download URL...");
        const url = await getDownloadURL(fileRef);
        console.log("Got URL:", url);

        return { url, path: fileRef.fullPath };
    } catch (error) {
        console.error("Error in uploadImage:", error);
        throw error;
    }
};
