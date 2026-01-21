import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { observeAuthState } from '../services/auth';

const Layout = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const unsubscribe = observeAuthState((user) => setCurrentUser(user));
        return () => unsubscribe();
    }, []);

    // Only show "추억 기록" for specific email
    const showUpload = currentUser?.email === 'kjongbae@gmail.com';

    return (
        <div className="min-h-screen bg-neutral-900 text-white font-sans">
            <nav className="fixed top-0 left-0 right-0 z-50 bg-neutral-900/80 backdrop-blur-md border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="text-xl font-bold tracking-tight text-white hover:text-blue-400 transition-colors">
                            Happy Archive
                        </Link>
                        <div className="flex space-x-4 items-center">
                            {showUpload && (
                                <Link to="/upload" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-white/10 transition text-blue-400">
                                    추억 기록
                                </Link>
                            )}
                            <Link to="/" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-white/10 transition">
                                갤러리
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="pt-16 min-h-screen">
                <div className="min-h-screen">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
