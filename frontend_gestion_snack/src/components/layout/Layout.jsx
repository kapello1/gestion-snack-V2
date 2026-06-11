// Layout principal de l'application
import Navbar from './Navbar';
import Footer from './Footer';
import Chatbot from '../Chatbot';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNotifications } from '../../context/NotificationContext';

const Layout = ({ children }) => {
  const { notifToast, dismissNotifToast } = useNotifications();

  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
      <Chatbot />

      {/* Toast custom WebSocket — centré, jamais coupé sur mobile */}
      {notifToast && (
        <div className="fixed top-4 left-4 right-4 z-[9999] bg-white rounded-xl shadow-2xl p-4 border-l-4 border-blue-500 flex items-start gap-3 mx-auto max-w-sm">
          <span className="text-2xl flex-shrink-0">{notifToast.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-tight">{notifToast.title}</p>
            <p className="text-gray-600 text-xs mt-1 leading-snug line-clamp-2">{notifToast.message}</p>
          </div>
          <button
            onClick={dismissNotifToast}
            className="flex-shrink-0 ml-1 text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
            aria-label="Fermer"
          >✕</button>
        </div>
      )}

      {/* ToastContainer conservé pour les autres toasts de l'app (login, erreurs…) */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default Layout;

