import { useLanguage } from '../../context/LanguageContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import {
  MapPin, Phone, Mail, Clock, ExternalLink, ChevronRight,
  Star, Zap, Shield, Users, Utensils, Award,
} from 'lucide-react';

const VALUE_ICONS = { quality: Star, service: Users, speed: Zap };

const AboutPage = () => {
  const { t } = useLanguage();
  const { info, openNow: open } = useRestaurant();
  const navigate = useNavigate();

  const teamRoles = [
    { icon: Shield, label: t('about.roleAdmin'),   desc: t('about.roleAdminDesc')   },
    { icon: Award,  label: t('about.roleCashier'),  desc: t('about.roleCashierDesc')  },
    { icon: Utensils,label: t('about.roleCook'),   desc: t('about.roleCookDesc')   },
    { icon: Users,  label: t('about.roleWaiter'),  desc: t('about.roleWaiterDesc')  },
  ];

  return (
    <Layout>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white rounded-full translate-y-36 -translate-x-36" />
        </div>
        <div className="max-w-6xl mx-auto px-6 py-20 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-semibold mb-6">
            <Utensils className="h-4 w-4" />
            {t('about.locationCity')}
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-white mb-4 tracking-tight">{info.name}</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8 leading-relaxed">{info.description}</p>
          <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm shadow-lg ${
            open ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            <span className={`w-2 h-2 rounded-full bg-white ${open ? 'animate-pulse' : ''}`} />
            {open ? t('about.open') : t('about.closed')}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12 sm:space-y-20">

        {/* Histoire + Mission */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-5">
              <Star className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-4">{t('about.story')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('about.storyText')}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-8 border border-orange-200">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center mb-5">
              <Award className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-4">{t('about.mission')}</h2>
            <p className="text-gray-700 leading-relaxed">{t('about.missionText')}</p>
          </div>
        </div>

        {/* Valeurs */}
        <div>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900">{t('about.values')}</h2>
            <div className="h-1.5 w-16 bg-blue-500 rounded-full mx-auto mt-3" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['quality', 'service', 'speed'].map((key) => {
              const Icon = VALUE_ICONS[key];
              const colors = { quality: 'from-blue-500 to-blue-600', service: 'from-green-500 to-green-600', speed: 'from-orange-500 to-orange-600' };
              return (
                <div key={key} className="relative bg-white rounded-3xl p-8 shadow-sm border border-gray-100 overflow-hidden group hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-16 translate-x-16 bg-gradient-to-br ${colors[key]} opacity-10 group-hover:opacity-20 transition-opacity`} />
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors[key]} flex items-center justify-center mb-5 shadow-lg`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">{t(`about.${key}`)}</h3>
                  <p className="text-gray-500 leading-relaxed text-sm">{t(`about.${key}Desc`)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact + Horaires */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-7 py-5">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Phone className="h-5 w-5" />{t('about.contact')}
              </h2>
            </div>
            <div className="p-7 space-y-4">
              <a href={`tel:${info.phone}`} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 hover:border-blue-200 border border-gray-100 transition-all group">
                <div className="w-11 h-11 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                  <Phone className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{t('about.phone')}</p>
                  <p className="font-bold text-gray-900">{info.phone}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-400 ml-auto transition-colors" />
              </a>

              <a href={`mailto:${info.email}`} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-green-50 hover:border-green-200 border border-gray-100 transition-all group">
                <div className="w-11 h-11 bg-green-100 group-hover:bg-green-200 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{t('about.email')}</p>
                  <p className="font-bold text-gray-900">{info.email}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-green-400 ml-auto transition-colors" />
              </a>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{t('about.address')}</p>
                  <p className="font-bold text-gray-900">{info.address}</p>
                </div>
              </div>

              <a
                href={info.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-md hover:shadow-blue-200 active:scale-95"
              >
                <MapPin className="h-4 w-4" />
                {t('about.viewOnMaps')}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Horaires */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className={`px-7 py-5 ${open ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-gray-500 to-gray-600'}`}>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('about.hours')}
                <span className="ml-auto text-xs bg-white/20 px-3 py-1 rounded-full font-bold">
                  {open ? t('about.open') : t('about.closed')}
                </span>
              </h2>
            </div>
            <div className="p-7 space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-blue-400" />
                  <span className="font-bold text-gray-900">{t('about.weekdays')}</span>
                </div>
                <span className="font-black text-gray-900">{info.hours.weekdayOpen} – {info.hours.weekdayClose}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-purple-400" />
                  <span className="font-bold text-gray-900">{t('about.sunday')}</span>
                </div>
                <span className="font-black text-gray-900">{info.hours.sundayOpen} – {info.hours.sundayClose}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Carte interactive */}
        <div>
          <div className="text-center mb-6">
            <h2 className="text-3xl font-black text-gray-900">{t('about.mapInteractive')}</h2>
            <p className="text-gray-500 mt-2">{info.address}</p>
            <div className="h-1.5 w-16 bg-orange-500 rounded-full mx-auto mt-3" />
          </div>
          <div className="rounded-3xl overflow-hidden shadow-xl border border-gray-200 h-[260px] sm:h-[420px]">
            <iframe
              src={info.mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              title={t('about.mapInteractive')}
            />
          </div>
          <div className="flex justify-center mt-4">
            <a
              href={info.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 hover:border-blue-400 text-gray-700 hover:text-blue-600 rounded-2xl font-semibold text-sm transition-all shadow-sm hover:shadow-md"
            >
              <ExternalLink className="h-4 w-4" />
              {t('about.viewOnMaps')}
            </a>
          </div>
        </div>

        {/* Équipe */}
        <div>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900">{t('about.team')}</h2>
            <p className="text-gray-500 mt-2">{t('about.teamDesc')}</p>
            <div className="h-1.5 w-16 bg-orange-500 rounded-full mx-auto mt-3" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {teamRoles.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white rounded-2xl p-4 sm:p-6 text-center shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-black text-gray-900 mb-1">{label}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24" />
          </div>
          <div className="relative z-10">
            <Utensils className="h-14 w-14 text-white/80 mx-auto mb-4" />
            <h2 className="text-3xl font-black text-white mb-3">{info.name}</h2>
            <p className="text-blue-200 mb-8 max-w-lg mx-auto">{info.description}</p>
            <button
              onClick={() => navigate('/customer/menu')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-black rounded-2xl transition-all shadow-lg active:scale-95 text-lg"
            >
              <Utensils className="h-5 w-5" />
              {t('about.viewMenu')}
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AboutPage;
