import React from 'react';
import { Scale, Leaf, Loader2, CheckCircle2, Settings2 } from 'lucide-react';

const RationEstimatorPanel = ({
  analyticsShift,
  setAnalyticsShift,
  currentStats,
  customRationConfig,
  setCustomRationConfig,
  isSavingRation,
  rationMsg,
  handleSaveRationConfig
}) => {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 min-w-[44px] min-h-[44px] bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0">
            <Scale size={22} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Smart Kitchen Ration Estimator ⚖️
            </h3>
            <p className="text-sm font-normal text-slate-600 dark:text-slate-400 mt-0.5">
              Translates live {analyticsShift === 'morning' ? 'Morning' : 'Evening'} headcount ({currentStats.coming} students) into exact raw cooking ingredients.
            </p>
          </div>
        </div>

        {setAnalyticsShift && (
          <div className="inline-flex rounded-xl bg-slate-200/60 dark:bg-slate-800 p-1 border border-slate-300/40 dark:border-slate-700/60 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setAnalyticsShift('morning')}
              className={`h-11 min-h-[44px] px-3.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                analyticsShift === 'morning'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ☀️ Morning
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsShift('night')}
              className={`h-11 min-h-[44px] px-3.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                analyticsShift === 'night'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🌙 Evening
            </button>
          </div>
        )}
      </div>

      {/* 4 Ingredient Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
          <span className="text-2xl" role="img" aria-label="Rice">🍚</span>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-2">Rice Required</p>
          <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {currentStats.estimates?.requiredKg?.rice !== undefined
              ? currentStats.estimates.requiredKg.rice
              : ((currentStats.coming * (customRationConfig.riceGrams || 120)) / 1000).toFixed(2)}{' '}
            <span className="text-sm font-normal text-slate-500">kg</span>
          </h4>
          <span className="text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-900/40 px-2 py-0.5 rounded-md mt-2 inline-block">
            {customRationConfig.riceGrams || 120}g / plate
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-800/40">
          <span className="text-2xl" role="img" aria-label="Atta">🌾</span>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-2">Flour / Atta</p>
          <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {currentStats.estimates?.requiredKg?.flour !== undefined
              ? currentStats.estimates.requiredKg.flour
              : ((currentStats.coming * (customRationConfig.flourGrams || 110)) / 1000).toFixed(2)}{' '}
            <span className="text-sm font-normal text-slate-500">kg</span>
          </h4>
          <span className="text-sm font-medium text-orange-700 dark:text-orange-400 bg-orange-100/70 dark:bg-orange-900/40 px-2 py-0.5 rounded-md mt-2 inline-block">
            {customRationConfig.flourGrams || 110}g / plate
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-yellow-50/70 dark:bg-yellow-950/20 border border-yellow-200/60 dark:border-yellow-800/40">
          <span className="text-2xl" role="img" aria-label="Dal">🥣</span>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-2">Dal & Lentils</p>
          <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {currentStats.estimates?.requiredKg?.dal !== undefined
              ? currentStats.estimates.requiredKg.dal
              : ((currentStats.coming * (customRationConfig.dalGrams || 45)) / 1000).toFixed(2)}{' '}
            <span className="text-sm font-normal text-slate-500">kg</span>
          </h4>
          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-400 bg-yellow-100/70 dark:bg-yellow-900/40 px-2 py-0.5 rounded-md mt-2 inline-block">
            {customRationConfig.dalGrams || 45}g / plate
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
          <span className="text-2xl" role="img" aria-label="Veggies">🥕</span>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-2">Fresh Veggies</p>
          <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {currentStats.estimates?.requiredKg?.veggies !== undefined
              ? currentStats.estimates.requiredKg.veggies
              : ((currentStats.coming * (customRationConfig.veggieGrams || 150)) / 1000).toFixed(2)}{' '}
            <span className="text-sm font-normal text-slate-500">kg</span>
          </h4>
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md mt-2 inline-block">
            {customRationConfig.veggieGrams || 150}g / plate
          </span>
        </div>
      </div>

      {/* Food Waste Prevented Banner */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 min-w-[44px] min-h-[44px] bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0">
            <Leaf size={22} />
          </div>
          <div>
            <h4 className="font-semibold text-emerald-950 dark:text-emerald-300 text-base">🌱 Food Waste Prevented</h4>
            <p className="text-sm font-normal text-emerald-800 dark:text-emerald-400 mt-0.5">
              Thanks to <strong>{currentStats.notComing}</strong> students skipping in advance for this {analyticsShift} shift!
            </p>
          </div>
        </div>
        <div className="text-right sm:border-l sm:border-emerald-200 dark:sm:border-emerald-800 sm:pl-6 shrink-0">
          <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {currentStats.estimates?.foodSavedKg !== undefined ? currentStats.estimates.foodSavedKg : '0.00'} kg
          </span>
          <span className="block text-sm font-medium text-emerald-700/90 dark:text-emerald-400/90">Saved from waste</span>
        </div>
      </div>

      {/* Per-Plate Norms Customizer */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Settings2 size={20} className="text-amber-500" />
          <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
            Customize Per-Plate Kitchen Norms (grams)
          </h4>
        </div>
        <p className="text-sm font-normal text-slate-600 dark:text-slate-400 mb-4">
          Adjust how many grams of raw ingredients your kitchen allocates per student for lunch or dinner thalis.
        </p>

        <form onSubmit={handleSaveRationConfig} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Rice (g)</label>
              <input
                type="number"
                min="1"
                value={customRationConfig.riceGrams}
                onChange={(e) => setCustomRationConfig({ ...customRationConfig, riceGrams: Number(e.target.value) })}
                required
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-base font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Atta (g)</label>
              <input
                type="number"
                min="1"
                value={customRationConfig.flourGrams}
                onChange={(e) => setCustomRationConfig({ ...customRationConfig, flourGrams: Number(e.target.value) })}
                required
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-base font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Dal (g)</label>
              <input
                type="number"
                min="1"
                value={customRationConfig.dalGrams}
                onChange={(e) => setCustomRationConfig({ ...customRationConfig, dalGrams: Number(e.target.value) })}
                required
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-base font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Veggies (g)</label>
              <input
                type="number"
                min="1"
                value={customRationConfig.veggieGrams}
                onChange={(e) => setCustomRationConfig({ ...customRationConfig, veggieGrams: Number(e.target.value) })}
                required
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-base font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {rationMsg && (
            <p className="text-sm font-medium p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {rationMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isSavingRation}
            className="w-full sm:w-auto px-6 h-12 min-h-[44px] bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer text-base"
          >
            {isSavingRation ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            <span>Save Per-Plate Norms</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default RationEstimatorPanel;
