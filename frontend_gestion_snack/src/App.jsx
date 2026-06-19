// Application principale avec routes
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { RestaurantProvider } from './context/RestaurantContext';
import { NotificationProvider } from './context/NotificationContext';
import { NetworkProvider } from './context/NetworkContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ROLES } from './utils/constants';

// Pages d'authentification
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import VerifyEmailCode from './pages/auth/VerifyEmailCode';
import VerifyResetCode from './pages/auth/VerifyResetCode';

// Page de profil
import Profile from './pages/Profile';

// Pages ADMIN
import AdminRestaurantSettings from './pages/admin/RestaurantSettings';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminEmployees from './pages/admin/Employees';
import AdminProviders from './pages/admin/Providers';
import AdminTables from './pages/admin/TablesAdmin';
import AdminStockAlerts from './pages/admin/StockAlerts';
import AdminSupplyRequest from './pages/admin/SupplyRequest';
import AdminSupplies from './pages/admin/Supplies';
import AdminTickets from './pages/admin/Tickets';

// Pages CUSTOMER
import CustomerMenu from './pages/customer/Menu';
import CheckoutPage from './pages/customer/Checkout';
import CustomerOrders from './pages/customer/Orders';
import CustomerReservations from './pages/customer/Reservations';
import CustomerReviews from './pages/customer/Reviews';
import CustomerAbout from './pages/customer/About';

// Pages CASHIER
import CashierPayments from './pages/cashier/Payments';

// Pages WAITER
import WaiterOrders from './pages/waiter/Orders';
import TableManagement from './pages/waiter/TableManagement';



// Pages COOK
import CookOrders from './pages/cook/Orders';

// Pages PROVIDER
import ProviderOrders from './pages/provider/Orders';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <RestaurantProvider>
    <AuthProvider>
    <NetworkProvider>
    <NotificationProvider>
      <Router>
        <Routes>
          {/* Routes publiques */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify-email-code" element={<VerifyEmailCode />} />
          <Route path="/verify-reset-code" element={<VerifyResetCode />} />

          {/* Routes protégées - Profil */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Routes ADMIN */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employees"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminEmployees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/providers"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminProviders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tables"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminTables />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/stock-alerts"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminStockAlerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/supplies/new"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminSupplyRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/supplies"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminSupplies />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tickets"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminTickets />
              </ProtectedRoute>
            }
          />

          {/* Routes CUSTOMER */}
          <Route
            path="/customer/menu"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerMenu />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/checkout"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/orders"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/reservations"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerReservations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/reviews"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerReviews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/about"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerAbout />
              </ProtectedRoute>
            }
          />

          {/* Routes CASHIER */}
          <Route
            path="/cashier/payments"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CASHIER]}>
                <CashierPayments />
              </ProtectedRoute>
            }
          />

          {/* Routes WAITER */}
          <Route
            path="/waiter/orders"
            element={
              <ProtectedRoute allowedRoles={[ROLES.WAITER]}>
                <WaiterOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/waiter/tables"
            element={
              <ProtectedRoute allowedRoles={[ROLES.WAITER]}>
                <TableManagement />
              </ProtectedRoute>
            }
          />

          {/* Routes COOK */}
          <Route
            path="/cook/orders"
            element={
              <ProtectedRoute allowedRoles={[ROLES.COOK]}>
                <CookOrders />
              </ProtectedRoute>
            }
          />

          {/* Routes PROVIDER */}
          <Route
            path="/provider/orders"
            element={
              <ProtectedRoute allowedRoles={[ROLES.PROVIDER]}>
                <ProviderOrders />
              </ProtectedRoute>
            }
          />

          {/* Route paramètres restaurant */}
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminRestaurantSettings />
              </ProtectedRoute>
            }
          />

          {/* Redirection par défaut */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </NotificationProvider>
    </NetworkProvider>
    </AuthProvider>
    </RestaurantProvider>
    </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
