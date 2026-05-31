import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { useRestaurant, computeIsOpen } from '../../context/RestaurantContext';
import { useLanguage } from '../../context/LanguageContext';
import { toast } from 'react-toastify';
import {
  Settings, MapPin, Phone, Mail, Clock, Globe, Save, RotateCcw,
  Eye, CheckCircle, Building2, ExternalLink, Info,
} from 'lucide-react';

const FieldGroup = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

const Input = ({ value, onChange, type = 'text', placeholder, icon: Icon }) => (
  <div className="relative">
    {Icon && (
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
    )}
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`block w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-sm font-medium`}
    />
  </div>
);

const TimeInput = ({ value, onChange, label }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-sm font-bold"
    />
  </div>
);

const SectionCard = ({ icon: Icon, title, color = 'blue', children }) => {
  const colors = {
    blue:   'border-blue-100 bg-blue-50/30',
    green:  'border-green-100 bg-green-50/30',
    purple: 'border-purple-100 bg-purple-50/30',
    amber:  'border-amber-100 bg-amber-50/30',
  };
  const iconColors = {
    blue:   'text-blue-600 bg-blue-100',
    green:  'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    amber:  'text-amber-600 bg-amber-100',
  };
  return (
    <div className={`bg-white rounded-2xl border ${colors[color]} shadow-sm overflow-hidden`}>
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className={`p-2 rounded-xl ${iconColors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-bold text-gray-900">{title}</h3>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
};

const AdminRestaurantSettings = () => {
  const { info, updateInfo, resetInfo, openNow: open } = useRestaurant();
  const { t } = useLanguage();
  const [form, setForm] = useState({ ...info, hours: { ...info.hours } });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setForm({ ...info, hours: { ...info.hours } });
    setHasChanges(false);
  }, [info]);

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const setHour = (key, value) => {
    setForm(prev => ({ ...prev, hours: { ...prev.hours, [key]: value } }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 400));
      updateInfo(form);
      setHasChanges(false);
      toast.success(t('settings.saveSuccess'));
    } catch {
      toast.error(t('settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm(t('settings.resetConfirm'))) {
      resetInfo();
      toast.success(t('settings.resetSuccess'));
    }
  };

  // Preview open/closed based on form values (not yet saved)
  const previewOpen = computeIsOpen(form.hours);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl">
                <Settings className="h-7 w-7 text-white" />
              </div>
              {t('settings.title')}
            </h1>
            <p className="text-gray-500 mt-2 ml-14">{t('settings.subtitle')}</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              {t('settings.reset')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${
                hasChanges && !saving
                  ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-200 active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  {t('settings.saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t('settings.save')}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live update info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 mb-6 flex items-center gap-3">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700 font-medium">{t('settings.liveUpdate')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">

            {/* Informations générales */}
            <SectionCard icon={Building2} title={t('settings.restaurantInfo')} color="blue">
              <FieldGroup label={t('settings.name')}>
                <Input value={form.name} onChange={v => setField('name', v)} placeholder="Nom du restaurant" icon={Building2} />
              </FieldGroup>
              <FieldGroup label={t('settings.description')}>
                <textarea
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  rows={2}
                  placeholder="Description courte"
                  className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all text-sm font-medium resize-none"
                />
              </FieldGroup>
            </SectionCard>

            {/* Coordonnées */}
            <SectionCard icon={Phone} title={t('settings.contact')} color="green">
              <FieldGroup label={t('settings.address')}>
                <Input value={form.address} onChange={v => setField('address', v)} placeholder="Adresse complète" icon={MapPin} />
              </FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <FieldGroup label={t('settings.phone')}>
                  <Input value={form.phone} onChange={v => setField('phone', v)} placeholder="+49 221..." icon={Phone} />
                </FieldGroup>
                <FieldGroup label={t('settings.email')}>
                  <Input value={form.email} onChange={v => setField('email', v)} type="email" placeholder="contact@..." icon={Mail} />
                </FieldGroup>
              </div>
            </SectionCard>

            {/* Liens maps */}
            <SectionCard icon={Globe} title={t('settings.mapsSection')} color="purple">
              <FieldGroup label={t('settings.mapsUrl')} hint={t('settings.mapsUrlHint')}>
                <Input value={form.mapsUrl} onChange={v => setField('mapsUrl', v)} placeholder="https://maps.google.com/..." icon={ExternalLink} />
              </FieldGroup>
              <FieldGroup label={t('settings.mapEmbed')} hint={t('settings.mapEmbedHint')}>
                <Input value={form.mapEmbedUrl} onChange={v => setField('mapEmbedUrl', v)} placeholder="https://www.openstreetmap.org/export/embed.html?..." icon={Globe} />
              </FieldGroup>
              {form.mapEmbedUrl && (
                <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 h-48">
                  <iframe
                    src={form.mapEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    title={t('settings.mapPreview')}
                  />
                </div>
              )}
            </SectionCard>

            {/* Horaires */}
            <SectionCard icon={Clock} title={t('settings.hours')} color="amber">
              <div>
                <p className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {t('settings.weekdays')}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <TimeInput value={form.hours.weekdayOpen} onChange={v => setHour('weekdayOpen', v)} label={t('settings.weekdayOpen')} />
                  <TimeInput value={form.hours.weekdayClose} onChange={v => setHour('weekdayClose', v)} label={t('settings.weekdayClose')} />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  {t('settings.sunday')}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <TimeInput value={form.hours.sundayOpen} onChange={v => setHour('sundayOpen', v)} label={t('settings.sundayOpen')} />
                  <TimeInput value={form.hours.sundayClose} onChange={v => setHour('sundayClose', v)} label={t('settings.sundayClose')} />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Colonne aperçu */}
          <div className="space-y-5">
            {/* Statut en direct */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5 text-purple-500" />
                {t('settings.preview')}
              </h3>

              <div className={`rounded-xl p-4 mb-4 text-center ${previewOpen ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className={`flex items-center justify-center gap-2 font-bold text-sm ${previewOpen ? 'text-green-700' : 'text-red-700'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${previewOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  {previewOpen ? t('settings.open') : t('settings.closed')}
                </div>
                <p className="text-xs text-gray-500 mt-1">{t('settings.currentStatus')}</p>
              </div>

              {/* Aperçu carte */}
              <div className="space-y-2.5 text-sm">
                <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-xl">
                  <Building2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="font-bold text-gray-900 break-all">{form.name}</span>
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-xl">
                  <MapPin className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-xs">{form.address}</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl">
                  <Phone className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 text-xs">{form.phone}</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl">
                  <Mail className="h-4 w-4 text-purple-500 flex-shrink-0" />
                  <span className="text-gray-700 text-xs break-all">{form.email}</span>
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-xl">
                  <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-gray-700">
                    <p><span className="font-semibold">{t('settings.weekdays')}:</span> {form.hours.weekdayOpen} – {form.hours.weekdayClose}</p>
                    <p><span className="font-semibold">{t('settings.sunday')}:</span> {form.hours.sundayOpen} – {form.hours.sundayClose}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Indicateur changements */}
            {hasChanges && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Save className="h-4 w-4 text-amber-600" />
                </div>
                <p className="text-xs font-bold text-amber-700">{t('settings.unsavedChanges')}</p>
                <p className="text-xs text-amber-600 mt-1">{t('settings.clickToSave')}</p>
              </div>
            )}

            {!hasChanges && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-green-700">{t('settings.upToDate')}</p>
                <p className="text-xs text-green-600 mt-1">{t('settings.synced')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminRestaurantSettings;
