// Page des avis pour les clients
import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Search, Plus, Edit, Trash2, MessageSquare } from 'lucide-react';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import StarRating from '../../components/StarRating';

const ReviewsPage = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [formData, setFormData] = useState({
    comment: '',
    star: 5,
  });

  useEffect(() => {
    loadReviews();
  }, [user]);

  const loadReviews = async () => {
    if (!user?.ownerId) return;

    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.REVIEWS.BY_CUSTOMER(user.ownerId));
      setReviews(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des avis:', error);
      toast.error('Erreur lors du chargement des avis');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingReview(null);
    setFormData({ comment: '', star: 5 });
    setShowModal(true);
  };

  const handleEdit = (review) => {
    setEditingReview(review);
    setFormData({ comment: review.comment || '', star: review.star || 5 });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingReview) {
        // Mettre à jour l'avis
        await api.put(API_ENDPOINTS.REVIEWS.BY_ID(editingReview.reviewId), {
          customerId: user.ownerId,
          comment: formData.comment,
          star: formData.star,
          createdBy: user.username,
        });
        toast.success('Avis mis à jour avec succès');
      } else {
        // Créer un nouvel avis
        await api.post(API_ENDPOINTS.REVIEWS.BASE, {
          customerId: user.ownerId,
          comment: formData.comment,
          star: formData.star,
          createdBy: user.username,
        });
        toast.success('Avis créé avec succès');
      }

      setShowModal(false);
      loadReviews();
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      toast.error(message);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet avis ?')) {
      return;
    }

    try {
      await api.delete(API_ENDPOINTS.REVIEWS.BY_ID(reviewId));
      toast.success('Avis supprimé avec succès');
      loadReviews();
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la suppression';
      toast.error(message);
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
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes avis</h1>
            <p className="text-gray-600 mt-2">Gérer vos avis et commentaires</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Nouvel avis</span>
          </button>
        </div>

        {/* Liste des avis */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              Aucun avis trouvé. Créez votre premier avis !
            </div>
          ) : (
            reviews.map((review) => (
              <div
                key={review.reviewId}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <StarRating value={review.star || 5} readOnly size="md" />
                    <span className="text-sm text-gray-600">
                      {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(review)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(review.reviewId)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>
              </div>
            ))
          )}
        </div>

        {/* Modal d'ajout/édition */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {editingReview ? 'Modifier mon avis' : 'Nouvel avis'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Votre note *
                  </label>
                  <StarRating
                    value={formData.star}
                    readOnly={false}
                    size="xl"
                    onChange={(val) => setFormData({ ...formData, star: val })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Votre commentaire *
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) =>
                      setFormData({ ...formData, comment: e.target.value })
                    }
                    rows={6}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Dites-nous ce que vous pensez de notre snack..."
                    required
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {editingReview ? 'Modifier' : 'Publier'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ReviewsPage;

