import { Link, useNavigate } from 'react-router-dom';
import { observeAuthState, loginWithGoogle, logout } from '../services/auth';

const Layout = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = observeAuthState((user) => setCurrentUser(user));
        return () => unsubscribe();
    }, []);

    const handleAuthAction = async () => {
        if (!currentUser) {
            try {
                const user = await loginWithGoogle();
                if (user.email === 'kjongbae@gmail.com') {
                    navigate('/upload');
                }
            } catch (err) {
                console.error("Login failed", err);
            }
        } else if (currentUser.email === 'kjongbae@gmail.com') {
            navigate('/upload');
        }
    };

    const isAdmin = currentUser?.email === 'kjongbae@gmail.com';

    return (
        <div className="min-h-screen bg-neutral-900 text-white font-sans">
            <nav className="fixed top-0 left-0 right-0 z-50 bg-neutral-900/80 backdrop-blur-md border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="text-xl font-bold tracking-tight text-white hover:text-blue-400 transition-colors">
                            Happy Archive
                        </Link>
                        <div className="flex space-x-2 items-center">
                            {isAdmin ? (
                                <Link to="/upload" className="px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition shadow-lg shadow-blue-900/20">
                                    Upload
                                </Link>
                            ) : (
                                <button
                                    onClick={handleAuthAction}
                                    className="px-3 py-2 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/20 text-gray-200 transition"
                                >
                                    추억 기록
                                </button>
                            )}

                            {currentUser && (
                                <button
                                    onClick={() => logout()}
                                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
                                    title={`${currentUser.displayName} (로그아웃)`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                </button>
                            )}

                            <Link to="/" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition" title="갤러리">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
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
