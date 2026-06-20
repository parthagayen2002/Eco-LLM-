import React from 'react';

const Sidebar = ({
  prompt,
  setPrompt,
  promptType,
  setPromptType,
  selectedModel,
  onModelChange,
  onAnalyze,
  onCompareAll,
  loading,
  comparingAll,
  modelStatus,
  apiUrl
}) => {
  const statusLabel = modelStatus.loading
    ? 'Checking backend...'
    : modelStatus.connected
      ? modelStatus.isLoaded
        ? 'Model ready'
        : 'Backend connected, model still loading'
      : 'Backend offline';

  return (
    <aside className="w-full lg:w-80 flex-shrink-0 space-y-6 mb-6 lg:mb-0">
      <section className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full lg:flex lg:flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-500 text-lg">medical_services</span>
            Medical QA Config
          </h2>
        </div>
        <div className="space-y-5 lg:flex-grow">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">Medical Question</label>
            <textarea
              id="promptInput"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg p-3 h-32 lg:h-48 focus:ring-primary focus:border-primary resize-none"
              placeholder="Does early aspirin reduce the risk of preeclampsia?"
            ></textarea>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">LLM Model</label>
              <select
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 px-2"
              >
                {modelStatus.availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {statusLabel}
              </p>
              {modelStatus.connected && modelStatus.loading && (
                <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                  Loading {selectedModel} now...
                </p>
              )}
              {modelStatus.connected && !modelStatus.loading && modelStatus.modelId !== selectedModel && (
                <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                  Selected model is different from the active backend model.
                </p>
              )}
              <p className="mt-1 text-[11px] text-slate-400 break-all">
                API: {apiUrl}
              </p>
              <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                For presentation: Phi-2 + Zero-Shot is the fastest. TinyLlama 1.1B is a smaller local comparison model.
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block font-medium">Prompt Strategy</label>
              <select
                value={promptType}
                onChange={(e) => setPromptType(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg py-2.5 px-2"
              >
                <option value="zero-shot">Zero-Shot (Direct)</option>
                <option value="few-shot">Few-Shot (With Examples)</option>
                <option value="cot">Chain-of-Thought (Reasoning)</option>
              </select>
            </div>
          </div>
        </div>
        <button
          id="analyzeBtn"
          onClick={onAnalyze}
          disabled={loading || comparingAll || !modelStatus.connected}
          className="w-full bg-primary hover:bg-emerald-600 text-white font-semibold py-4 rounded-lg flex items-center justify-center gap-2 transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-xl">stethoscope</span>
          {loading ? 'Consulting AI...' : 'Analyze Performance'}
        </button>
        <button
          onClick={onCompareAll}
          disabled={loading || comparingAll || !modelStatus.connected}
          className="w-full bg-slate-900 hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-xl">compare_arrows</span>
          {comparingAll ? 'Comparing Models...' : 'Compare All Models'}
        </button>
      </section>
    </aside>
  );
};

export default Sidebar;
