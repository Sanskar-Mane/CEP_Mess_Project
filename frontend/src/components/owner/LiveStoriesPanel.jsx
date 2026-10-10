import React from 'react';
import { Camera, Upload, X, Loader2, Sparkles, Trash2 } from 'lucide-react';

const LiveStoriesPanel = ({
  storyImage,
  setStoryImage,
  storyCaption,
  setStoryCaption,
  isPostingStory,
  storyMsg,
  myActiveStories,
  isDeletingStory,
  handleImageUpload,
  handlePostStory,
  handleDeleteStory
}) => {
  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Intro Banner */}
      <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-800/40 flex items-start gap-3">
        <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
          <Camera size={22} />
        </div>
        <div>
          <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
            Post 24-Hour Live Campus Story 📸
          </h4>
          <p className="text-sm font-normal text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Show students what's cooking right now! Live photos disappear automatically after 24 hours from all student feeds.
          </p>
        </div>
      </div>

      <form onSubmit={handlePostStory} className="space-y-4">
        {/* Photo Upload */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Food / Kitchen Photo
          </label>
          {storyImage ? (
            <div className="relative rounded-2xl overflow-hidden h-48 bg-slate-950 border border-slate-200 dark:border-slate-800">
              <img src={storyImage} alt="Story Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setStoryImage('')}
                className="absolute top-2.5 right-2.5 w-11 h-11 min-w-[44px] min-h-[44px] bg-slate-900/80 hover:bg-rose-600 text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                title="Remove photo"
                aria-label="Remove photo"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-colors bg-slate-50 dark:bg-slate-950 min-h-[120px]">
              <Upload size={30} className="text-orange-500 mb-2" />
              <span className="text-base font-medium text-slate-800 dark:text-slate-200">Click to upload photo</span>
              <span className="text-sm text-slate-500 mt-1">JPG, PNG, WebP (automatically compressed)</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Caption */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Caption (e.g. "Piping hot jalebis ready!")
          </label>
          <input
            type="text"
            maxLength={100}
            value={storyCaption}
            onChange={(e) => setStoryCaption(e.target.value)}
            placeholder="Short live announcement..."
            className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-base font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
          />
          <span className="text-sm text-slate-500 block text-right mt-1">
            {storyCaption.length}/100
          </span>
        </div>

        {storyMsg && (
          <p className="text-sm font-medium p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {storyMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={isPostingStory || !storyImage}
          className="w-full h-12 min-h-[44px] bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer text-base"
        >
          {isPostingStory ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
          <span>Publish Live Story</span>
        </button>
      </form>

      {/* Active Stories List */}
      {myActiveStories && myActiveStories.length > 0 && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Active Live Stories ({myActiveStories.length})
            </h4>
            <span className="text-sm text-slate-500">Auto-deletes in 24h</span>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {myActiveStories.map((story) => (
              <div
                key={story._id}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={story.imageUrl}
                    alt="Story"
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs"
                  />
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-900 dark:text-white truncate">
                      {story.caption || 'No caption'}
                    </p>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(story.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteStory(story._id)}
                  disabled={isDeletingStory === story._id}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                  title="Delete Story immediately"
                  aria-label="Delete Story"
                >
                  {isDeletingStory === story._id ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Trash2 size={18} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveStoriesPanel;
