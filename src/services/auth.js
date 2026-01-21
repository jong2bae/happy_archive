import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, browserSessionPersistence } from "firebase/auth";

const provider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
    try {
        // Set persistence to session only (clears on tab/window close)
        await auth.setPersistence(browserSessionPersistence);
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Login failed", error);
        throw error;
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed", error);
        throw error;
    }
};

export const observeAuthState = (callback) => {
    return onAuthStateChanged(auth, callback);
};
