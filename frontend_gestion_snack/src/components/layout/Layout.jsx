// Layout principal de l'application
import Navbar from './Navbar';
import Footer from './Footer';
import Chatbot from '../Chatbot';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
      <Chatbot />
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        style={{
          zIndex: 9999,
          paddingTop: '0.5rem',
          width: '100%',
          maxWidth: '400px',
          left: '50%',
          transform: 'translateX(-50%)',
          top: '0',
        }}
      />
    </div>
  );
};

export default Layout;

