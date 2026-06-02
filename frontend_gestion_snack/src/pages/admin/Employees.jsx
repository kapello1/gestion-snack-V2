import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Search, Plus, Edit, Trash2, User, Mail, Phone, MapPin, DollarSign, Calendar, UserX, UserCheck } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useAuth } from '../../context/AuthContext';

const EmployeesPage = () => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        phone: '',
        address: '',
        position: 'WAITER',
        salary: '',
        hireDate: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        loadEmployees();
    }, []);

    useEffect(() => {
        filterEmployees();
    }, [searchTerm, employees]);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            const response = await api.get(API_ENDPOINTS.EMPLOYEES.BASE);
            const mapped = (response.data || []).map(emp => ({
                ...emp,
                position: emp.roleName || emp.position || 'WAITER'
            }));
            setEmployees(mapped);
        } catch (error) {
            console.error('Erreur chargement employés:', error);
            toast.error('Erreur lors du chargement des employés');
        } finally {
            setLoading(false);
        }
    };

    const filterEmployees = () => {
        if (!searchTerm) {
            setFilteredEmployees(employees);
            return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = employees.filter(emp =>
            emp.firstName?.toLowerCase().includes(lowerTerm) ||
            emp.lastName?.toLowerCase().includes(lowerTerm) ||
            emp.username?.toLowerCase().includes(lowerTerm) ||
            emp.email?.toLowerCase().includes(lowerTerm)
        );
        setFilteredEmployees(filtered);
    };

    const handleAdd = () => {
        setEditingEmployee(null);
        setFormData({
            firstName: '',
            lastName: '',
            username: '',
            email: '',
            phone: '',
            address: '',
            position: 'WAITER',
            salary: '',
            hireDate: new Date().toISOString().split('T')[0],
        });
        setShowModal(true);
    };

    const handleEdit = (employee) => {
        setEditingEmployee(employee);
        setFormData({
            firstName: employee.firstName || '',
            lastName: employee.lastName || '',
            username: employee.username || '',
            email: employee.email || '',
            phone: employee.phone || '',
            address: employee.address || '',
            position: employee.position || 'WAITER',
            salary: employee.salary || '',
            hireDate: employee.hireDate || new Date().toISOString().split('T')[0],
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cet employé ? (Cette action est irréversible)')) return;
        try {
            await api.delete(API_ENDPOINTS.EMPLOYEES.BY_ID(id));
            toast.success('Employé supprimé');
            loadEmployees();
        } catch (error) {
            toast.error('Erreur lors de la suppression');
        }
    };

    const handleToggleActive = async (emp) => {
        const isCurrentlyActive = emp.isActive !== false;
        const action = isCurrentlyActive ? 'désactiver' : 'réactiver';
        if (!window.confirm(`Voulez-vous ${action} l'employé ${emp.firstName} ${emp.lastName} ?`)) return;
        try {
            const endpoint = isCurrentlyActive
                ? API_ENDPOINTS.EMPLOYEES.DEACTIVATE(emp.employeeId)
                : API_ENDPOINTS.EMPLOYEES.ACTIVATE(emp.employeeId);
            await api.patch(endpoint);
            toast.success(isCurrentlyActive ? 'Employé désactivé — connexion bloquée' : 'Employé réactivé');
            loadEmployees();
        } catch (error) {
            toast.error(error.response?.data?.message || `Erreur lors de la ${action === 'désactiver' ? 'désactivation' : 'réactivation'}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const roleMapping = {
                ADMIN: 1,
                CUSTOMER: 2,
                CASHIER: 3,
                WAITER: 4,
                COOK: 5,
            };
            const payload = { 
                ...formData, 
                roleId: roleMapping[formData.position] || 4,
                createdBy: user.username, 
                updatedBy: user.username 
            };

            if (editingEmployee) {
                await api.put(API_ENDPOINTS.EMPLOYEES.BY_ID(editingEmployee.employeeId), payload);
                toast.success('Employé mis à jour');
            } else {
                await api.post(API_ENDPOINTS.EMPLOYEES.BASE, payload);
                toast.success('Employé créé');
            }
            setShowModal(false);
            loadEmployees();
        } catch (error) {
            const msg = error.response?.data?.message || 'Erreur lors de l\'enregistrement';
            toast.error(msg);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Gestion des Employés</h1>
                        <p className="text-gray-600 mt-2">Gérer le personnel du snack</p>
                    </div>
                    <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                        <Plus className="h-5 w-5" />
                        Ajouter un employé
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher un employé..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEmployees.map((emp) => (
                        <div key={emp.employeeId} className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 ${emp.isActive === false ? 'border-red-400 opacity-75' : 'border-green-400'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${emp.isActive === false ? 'bg-red-100' : 'bg-blue-100'}`}>
                                        <User className={`h-6 w-6 ${emp.isActive === false ? 'text-red-500' : 'text-blue-600'}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{emp.firstName} {emp.lastName}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                                {emp.position}
                                            </span>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${emp.isActive === false ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {emp.isActive === false ? 'Désactivé' : 'Actif'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <button
                                        onClick={() => handleToggleActive(emp)}
                                        title={emp.isActive === false ? 'Réactiver' : 'Désactiver'}
                                        className={emp.isActive === false ? 'text-green-600 hover:text-green-800' : 'text-orange-500 hover:text-orange-700'}
                                    >
                                        {emp.isActive === false
                                            ? <UserCheck className="h-4 w-4" />
                                            : <UserX className="h-4 w-4" />
                                        }
                                    </button>
                                    <button onClick={() => handleEdit(emp)} className="text-blue-600 hover:text-blue-800"><Edit className="h-4 w-4" /></button>
                                    <button onClick={() => handleDelete(emp.employeeId)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {emp.email}</div>
                                <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {emp.phone || 'N/A'}</div>
                                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {emp.address || 'N/A'}</div>
                                <div className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> {emp.salary} €</div>
                                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Embauché le {emp.hireDate}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                            <h2 className="text-2xl font-bold mb-4">{editingEmployee ? 'Modifier' : 'Ajouter'} un employé</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Prénom</label>
                                        <input type="text" required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Nom</label>
                                        <input type="text" required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Nom d'utilisateur</label>
                                        <input type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                        <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                                        <PhoneInput defaultCountry="BE" value={formData.phone} onChange={val => setFormData({ ...formData, phone: val })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Poste</label>
                                        <select value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                            <option value="WAITER">Serveur</option>
                                            <option value="COOK">Cuisinier</option>
                                            <option value="CASHIER">Caissier</option>
                                            <option value="ADMIN">Administrateur</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Salaire</label>
                                        <input type="number" value={formData.salary} onChange={e => setFormData({ ...formData, salary: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Date d'embauche</label>
                                        <input type="date" value={formData.hireDate} onChange={e => setFormData({ ...formData, hireDate: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Adresse</label>
                                        <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" rows="2"></textarea>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-4 mt-6">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Annuler</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Enregistrer</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default EmployeesPage;
