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
        <div className="mb-6 flex flex-wrap gap-3 items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Mes avis</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Gérer vos avis et commentaires</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-3 min-h-[44px] bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-sm touch-manipulation"
          >
            <Plus className="h-5 w-5" />
            <span>Nouvel avis</span>
          </button>
        </div>

        {/* Liste des avis */}
        <div className="space-y-3 sm:space-y-4">
          {reviews.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              Aucun avis trouvé. Créez votre premier avis !
            </div>
          ) : (
            reviews.map((review) => (
              <div
                key={review.reviewId}
                className="bg-white rounded-xl shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start gap-3 mb-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StarRating value={review.star || 5} readOnly size="md" />
                    <span className="text-sm text-gray-600">
                      {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(review)}
                      className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors touch-manipulation"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(review.reviewId)}
                      className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors touch-manipulation"
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
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
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
                    rows={4}
                    className="block w-full px-3 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all"
                    placeholder="Dites-nous ce que vous pensez de notre snack..."
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 min-h-[48px] bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors touch-manipulation"
                  >
                    {editingReview ? 'Modifier' : 'Publier'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 min-h-[48px] bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors touch-manipulation"
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

