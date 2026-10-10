import React, { useState } from 'react';
import {
  ChefHat,
  Sunrise,
  Moon,
  Edit3,
  Plus,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';

const formatCutoffDisplay = (timeStr) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':').map(Number);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return timeStr;
  const [h, m] = parts;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  const minStr = m < 10 ? `0${m}` : m;
  return `${hour12}:${minStr} ${ampm}`;
};

const MenuHeroCard = ({
  t,
  menuDate,
  setMenuDate,
  getLocalDateString,
  displayDate,
  morningMenu,
  nightMenu,
  morningCutoff,
  nightCutoff,
  onSaveMenu,
  isPublishing
}) => {
  // Which meal shift is currently open in the editor (null = calm read-only view)
  const [editingShift, setEditingShift] = useState(null);

  // Form states for the active editor
  const [formItems, setFormItems] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formError, setFormError] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleStartEdit = (shift) => {
    const existing = shift === 'morning' ? morningMenu : nightMenu;
    setEditingShift(shift);
    setFormItems(existing && existing.items ? existing.items.join(', ') : '');
    setFormPrice(existing && existing.price !== undefined ? existing.price.toString() : '60');
    setFormError('');
    setShowMoreOptions(false);
    setSuccessMsg('');
  };

  const handleClearForm = () => {
    setFormItems('');
    setFormPrice('');
    setFormError('');
  };

  const handleCancelEdit = () => {
    setEditingShift(null);
    setFormError('');
    setSuccessMsg('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formItems.trim()) {
      setFormError('Please enter at least one dish for the menu.');
      return;
    }
    const numPrice = Number(formPrice);
    if (formPrice === '' || isNaN(numPrice) || numPrice < 0) {
      setFormError('Please enter a valid non-negative thali price.');
      return;
    }

    setFormError('');
    const itemsArray = formItems
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);

    try {
      await onSaveMenu({
        date: menuDate,
        shift: editingShift,
        items: itemsArray,
        price: numPrice
      });
      setSuccessMsg(t.menuUpdatedSuccess || 'Menu saved successfully!');
      setTimeout(() => {
        setEditingShift(null);
        setSuccessMsg('');
      }, 1000);
    } catch (err) {
      setFormError(err.message || 'Failed to save menu.');
    }
  };

  // Helper renderer for each meal section
  const renderMealSection = (shift, isMorning) => {
    const isEditing = editingShift === shift;
    const menuData = isMorning ? morningMenu : nightMenu;
    const cutoffTime = isMorning ? morningCutoff : nightCutoff;
    const shiftLabel = isMorning
      ? (t.morningMenu || 'Morning Menu (Lunch)')
      : (t.nightMenu || 'Evening Menu (Dinner)');
    const IconComponent = isMorning ? Sunrise : Moon;
    const themeAccent = isMorning
      ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20'
      : 'border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20';
    const iconColor = isMorning
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300';

    return (
      <div
        className={`rounded-2xl p-4 sm:p-6 border transition-all flex flex-col justify-between ${themeAccent}`}
      >
        <div>
          {/* Section Header: Icon, Clean Heading, Read-Only Cut-off Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                <IconComponent size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {shiftLabel}
                </h3>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {isMorning ? 'Lunch meal' : 'Dinner meal'}
                </span>
              </div>
            </div>

            {/* Read-only Cutoff Display (Small readable text only, NO editing controls here) */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-sm font-medium shrink-0 self-start sm:self-auto"
              title="Attendance cut-off time for students"
            >
              <Clock size={16} className={isMorning ? 'text-amber-600' : 'text-indigo-600'} />
              <span>
                {t.cutoffTimeTag || 'Cut-off'}: {formatCutoffDisplay(cutoffTime) || (isMorning ? '9:30 AM' : '5:30 PM')}
              </span>
            </div>
          </div>

          {/* VIEW 1: READ-ONLY SUMMARY (PAGE STAYS CALM) */}
          {!isEditing ? (
            menuData && menuData.items && menuData.items.length > 0 ? (
              <div className="py-4 space-y-4">
                {/* Dishes list */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                    {t.menuItems || 'Menu Items'}:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {menuData.items.map((dish, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-xl text-base font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-2xs"
                      >
                        {dish}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Price and Published status */}
                <div className="flex items-center justify-between text-base font-medium pt-2">
                  <div className="text-slate-800 dark:text-slate-200">
                    <span>{t.priceLabel || 'Thali Price'}: </span>
                    <span className="text-orange-600 dark:text-orange-400 font-bold text-lg">
                      ₹{menuData.price !== undefined ? menuData.price : 60}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 size={16} /> Published
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 px-4 my-3 text-center rounded-xl bg-white/60 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800">
                <p className="text-base font-medium text-slate-600 dark:text-slate-400">
                  {t.menuNotSet || 'No dishes published yet for this shift'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                  Tap below to add today's items and price
                </p>
              </div>
            )
          ) : (
            /* VIEW 2: SIMPLE, PROFESSIONAL MENU SETTER FORM */
            <form onSubmit={handleFormSubmit} className="py-4 space-y-4">
              {/* Tidy input for dishes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  {t.dishesLabel || 'Dishes (Comma-separated)'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={formItems}
                  onChange={(e) => setFormItems(e.target.value)}
                  placeholder={t.dishesPlaceholder || 'Roti, Dal, Rice, Sabzi'}
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-normal text-base outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none"
                />
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400 block mt-1">
                  Example: Roti, Dal, Rice, Sabzi, Gulab Jamun
                </span>
              </div>

              {/* Tidy input for price */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  {t.priceLabel || 'Thali Price (₹)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-bold text-base">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="60"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium text-base outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  />
                </div>
              </div>

              {/* "More options" toggle for rarely used notes */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowMoreOptions(!showMoreOptions)}
                  className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-orange-600 flex items-center gap-1 transition-colors cursor-pointer py-1"
                >
                  <span>{t.moreOptions || 'More options'}</span>
                  {showMoreOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showMoreOptions && (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-normal text-slate-600 dark:text-slate-400 mt-2 space-y-1 leading-relaxed">
                    <p>• Menu updates broadcast in real-time to student apps.</p>
                    <p>• You will be prompted to confirm attendance cut-off times right after saving.</p>
                  </div>
                )}
              </div>

              {/* Inline validation messages */}
              {formError && (
                <p className="text-sm font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
                  {formError}
                </p>
              )}
              {successMsg && (
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 flex items-center gap-2">
                  <CheckCircle2 size={18} /> {successMsg}
                </p>
              )}

              {/* Exactly two action buttons: Primary Save & Secondary Reset/Cancel */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="flex-1 h-12 min-h-[44px] bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-base cursor-pointer"
                >
                  {isPublishing ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  <span>{isPublishing ? (t.savingMenu || 'Saving...') : (t.saveMenu || 'Save Menu')}</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="h-12 min-h-[44px] px-4 rounded-xl font-medium text-base text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    title={t.clearMenuForm || 'Clear input fields'}
                  >
                    <RotateCcw size={16} />
                    <span>{t.clearMenuForm || 'Clear'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="h-12 min-h-[44px] px-4 rounded-xl font-medium text-base text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    {t.cancelEdit || 'Cancel'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Read-Only State Action Button */}
        {!isEditing && (
          <div className="pt-3">
            <button
              type="button"
              onClick={() => handleStartEdit(shift)}
              className={`w-full h-12 min-h-[44px] px-5 rounded-xl font-medium text-base transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                menuData
                  ? 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs'
                  : 'bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-sm'
              }`}
            >
              {menuData ? <Edit3 size={18} /> : <Plus size={18} />}
              <span>
                {menuData
                  ? `${t.editMenu || 'Edit Menu'}`
                  : `${t.addMenu || 'Add Dishes'}`}
              </span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="relative rounded-3xl p-5 sm:p-7 bg-white dark:bg-slate-900 border-2 border-orange-500/40 dark:border-orange-500/30 shadow-lg transition-all">
      {/* Top accent highlight */}
      <div className="absolute top-0 left-6 right-6 h-1 bg-orange-500 rounded-full" />

      {/* Header: Prominent Card Title + Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <ChefHat size={26} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t.menuSetup || "Today's Menu"}
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {displayDate}
            </p>
          </div>
        </div>

        {/* Date Selector: Today / Tomorrow */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setMenuDate(getLocalDateString(0));
              setEditingShift(null);
            }}
            className={`h-11 min-h-[44px] px-4 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              menuDate === getLocalDateString(0)
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {t.today}
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuDate(getLocalDateString(1));
              setEditingShift(null);
            }}
            className={`h-11 min-h-[44px] px-4 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              menuDate === getLocalDateString(1)
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {t.tomorrow}
          </button>
        </div>
      </div>

      {/* Two clearly separated meal sections (Morning / Evening) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6">
        {renderMealSection('morning', true)}
        {renderMealSection('night', false)}
      </div>
    </section>
  );
};

export default MenuHeroCard;
