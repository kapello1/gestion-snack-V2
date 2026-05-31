import { Utensils, Phone, Mail, MapPin, Clock, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useRestaurant } from '../../context/RestaurantContext';

const Footer = () => {
  const { t } = useLanguage();
  const { info, openNow: open } = useRestaurant();

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Logo + description */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-blue-600 p-2 rounded-xl">
                <Utensils className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">{info.name}</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">{t('footer.description')}</p>
            <div className="mt-4">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                open
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${open ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                {open ? t('footer.open') : t('footer.closed')}
              </span>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-base font-bold mb-5 text-white uppercase tracking-wider">{t('footer.contact')}</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>{info.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <a href={`tel:${info.phone}`} className="hover:text-white transition-colors">{info.phone}</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <a href={`mailto:${info.email}`} className="hover:text-white transition-colors break-all">{info.email}</a>
              </li>
            </ul>
          </div>

          {/* Horaires */}
          <div>
            <h3 className="text-base font-bold mb-5 text-white uppercase tracking-wider">{t('footer.hours')}</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-300">{t('footer.weekdays')}</p>
                  <p>{info.hours.weekdayOpen} – {info.hours.weekdayClose}</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-300">{t('footer.sunday')}</p>
                  <p>{info.hours.sundayOpen} – {info.hours.sundayClose}</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Localisation */}
          <div>
            <h3 className="text-base font-bold mb-5 text-white uppercase tracking-wider">{t('footer.location')}</h3>
            <a href={info.mapsUrl} target="_blank" rel="noopener noreferrer" className="block group">
              <div className="relative w-full h-36 bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-blue-500 transition-colors">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-800 to-gray-900">
                  <MapPin className="h-8 w-8 text-red-400" />
                  <span className="text-xs text-gray-400 text-center px-3 break-all">{info.address}</span>
                  <span className="flex items-center gap-1 text-[10px] text-blue-400 group-hover:text-blue-300 transition-colors mt-1 font-semibold">
                    <ExternalLink className="h-3 w-3" />
                    {t('footer.mapsOpen')}
                  </span>
                </div>
                <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full opacity-60" />
                <div className="absolute top-5 left-4 w-1.5 h-1.5 bg-blue-400 rounded-full opacity-40" />
                <div className="absolute bottom-3 right-6 w-1.5 h-1.5 bg-blue-400 rounded-full opacity-40" />
              </div>
            </a>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col md:flex-row items-center justify-between gap-3 text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} {info.name}. {t('footer.rights')}</p>
          <p>{t('footer.devWith')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
