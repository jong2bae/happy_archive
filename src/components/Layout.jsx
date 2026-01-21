import React from 'react';
import { Link } from 'react-router-dom';

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen bg-neutral-900 text-white font-sans">
            <nav className="fixed top-0 left-0 right-0 z-50 bg-neutral-900/80 backdrop-blur-md border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="text-xl font-bold tracking-tight">
                            Gallery
                        </Link>
                        <div className="flex space-x-4">
                            <Link to="/upload" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-white/10 transition">
                                Upload
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="pt-16 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
