import { useState } from 'react';
import { ShoppingCart, Package2, Droplets, AlertCircle, PlusCircle } from 'lucide-react';
import StarRating from './StarRating';
import AllergyTooltip from './AllergyTooltip';
import { LABELS, PRODUCT_TYPE } from '../utils/constants';

const PLACEHOLDER_FOOD = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80';
const PLACEHOLDER_DRINK = 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80';

const ProductCard = ({
  product,
  onAddToCart,
  onEdit,
  onDelete,
  onProductClick,
  showActions = false,
  showCartButton = false,
  cartQuantity = 0,
  isInCart = false,
  reviewCount = 0,
}) => {
  const [imgError, setImgError] = useState(false);

  const isOutOfStock = product.quantityAvailable <= 0;
  const isLowStock = product.quantityAvailable > 0 && product.quantityAvailable <= product.alertThreshold;

  const defaultImage = product.productType === PRODUCT_TYPE.DRINK ? PLACEHOLDER_DRINK : PLACEHOLDER_FOOD;
  const imageSrc = (!imgError && product.imageUrl) ? product.imageUrl : defaultImage;

  const typeColor = product.productType === PRODUCT_TYPE.DRINK
    ? 'bg-sky-100 text-sky-700 border-sky-200'
    : 'bg-orange-100 text-orange-700 border-orange-200';

  const TypeIcon = product.productType === PRODUCT_TYPE.DRINK ? Droplets : Package2;

  const handleDetailsClick = (e) => {
    e.stopPropagation();
    if (!isOutOfStock) onProductClick?.(product);
  };

  return (
    <div
      className={`
        group relative bg-white rounded-2xl overflow-hidden shadow-sm
        border border-gray-100 transition-all duration-300
        ${isOutOfStock
          ? 'opacity-60 grayscale cursor-not-allowed shadow-none'
          : 'hover:shadow-xl hover:-translate-y-1 hover:border-gray-200'
        }
      `}
    >
      {/* Badge rupture de stock */}
      {isOutOfStock && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center bg-gray-800/80 py-2">
          <AlertCircle className="h-4 w-4 text-red-400 mr-1.5" />
          <span className="text-white text-xs font-bold tracking-wide uppercase">Rupture de stock</span>
        </div>
      )}

      {/* Bouton "+" — angle supérieur DROIT — déclenche le modal détails */}
      {!isOutOfStock && onProductClick && (
        <div className="absolute top-2 right-2 z-20">
          <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-60 animate-ping" />
          <button
            type="button"
            onClick={handleDetailsClick}
            aria-label="Voir les détails du produit"
            className="relative bg-orange-500 hover:bg-orange-600 text-white rounded-full p-1.5 shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <PlusCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Image cliquable */}
      <div
        onClick={() => !isOutOfStock && onProductClick?.(product)}
        className={`relative h-44 overflow-hidden bg-gray-50 cursor-pointer ${isOutOfStock ? 'mt-7' : ''}`}
      >
        <img
          src={imageSrc}
          alt={product.productName}
          className={`w-full h-full object-cover transition-transform duration-500 ${!isOutOfStock ? 'group-hover:scale-105' : ''}`}
          onError={() => setImgError(true)}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Badge type */}
        <div className="absolute bottom-2 left-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${typeColor} backdrop-blur-sm`}>
            <TypeIcon className="h-3 w-3" />
            {LABELS.PRODUCT_TYPE[product.productType] || product.productType}
          </span>
        </div>

        {/* Quantity badge in cart */}
        {isInCart && cartQuantity > 0 && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
            {cartQuantity}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="p-4">
        <div
          onClick={() => !isOutOfStock && onProductClick?.(product)}
          className="mb-2 cursor-pointer"
        >
          <h3 className="text-base font-bold text-gray-900 leading-tight mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {product.productName}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <StarRating value={product.averageRating || 0} readOnly size="sm" />
            {reviewCount > 0 && <span className="text-xs text-gray-400">({reviewCount})</span>}
          </div>
        </div>

        {product.description && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{product.description}</p>
        )}

        <div className="mb-3">
          <AllergyTooltip alergy={product.alergy} />
        </div>

        <div className="flex items-end justify-between mb-3">
          <span className="text-xl font-extrabold text-gray-900">{product.unitPrice?.toFixed(2)} €</span>
          <div className="flex flex-col items-end gap-1">
            {isLowStock && !isOutOfStock && (
              <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                <AlertCircle className="h-3 w-3" />
                Stock faible
              </span>
            )}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isOutOfStock ? 'bg-red-100 text-red-700'
              : isLowStock ? 'bg-amber-100 text-amber-700'
              : 'bg-green-100 text-green-700'
            }`}>
              {isOutOfStock ? 'Épuisé' : `${product.quantityAvailable} restants`}
            </span>
          </div>
        </div>

        {/* Bouton panier client */}
        {showCartButton && (
          <button
            disabled={isOutOfStock}
            onClick={() => !isOutOfStock && onAddToCart?.(product)}
            className={`
              w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
              text-sm font-semibold transition-all duration-200
              ${isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : isInCart
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg active:scale-95'
              }
            `}
          >
            <ShoppingCart className="h-4 w-4" />
            {isOutOfStock ? 'Indisponible' : isInCart ? `Dans le panier (${cartQuantity})` : 'Ajouter au panier'}
          </button>
        )}

        {/* Actions admin */}
        {showActions && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onEdit?.(product)}
              className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition-colors"
            >
              ✏️ Modifier
            </button>
            <button
              onClick={() => onDelete?.(product.productId)}
              className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition-colors"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
