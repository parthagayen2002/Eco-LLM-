import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import MetricsCards from '../components/MetricsCards';
import ResultsChart from '../components/ResultsChart';
import EnergyScatter from '../components/EnergyScatter';
import AccuracyPowerChart from '../components/AccuracyPowerChart';
import TrendLineChart from '../components/TrendLineChart';
import RankingTable from '../components/RankingTable';
import SessionSummary from '../components/SessionSummary';
import ComparisonTable from '../components/ComparisonTable';
import Footer from '../components/Footer';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const DEFAULT_MODEL = 'microsoft/phi-2';
const DEFAULT_MODELS = [
  { id: 'google/gemma-2b', label: 'Gemma 2B (largest built-in option)' },
  { id: 'microsoft/phi-2', label: 'Phi-2' },
  { id: 'Qwen/Qwen2.5-0.5B-Instruct', label: 'Qwen 2.5 0.5B Instruct' },
  { id: 'TinyLlama/TinyLlama-1.1B-Chat-v1.0', label: 'TinyLlama 1.1B' }
];

const MODEL_SCORES = {
  'microsoft/phi-2': { accuracy: 88, power: 78 },
  'google/gemma-2b': { accuracy: 91, power: 92 },
  'Qwen/Qwen2.5-0.5B-Instruct': { accuracy: 78, power: 48 },
  'TinyLlama/TinyLlama-1.1B-Chat-v1.0': { accuracy: 82, power: 61 }
};

const STRATEGY_ADJUSTMENTS = {
  'zero-shot': { accuracy: 0, power: 0 },
  'few-shot': { accuracy: 3, power: 6 },
  'cot': { accuracy: 5, power: 10 }
};

const Dashboard = ({ theme, toggleTheme }) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [prompt, setPrompt] = useState('');
  const [promptType, setPromptType] = useState('zero-shot');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [comparingAll, setComparingAll] = useState(false);
  const [modelStatus, setModelStatus] = useState({
    loading: true,
    connected: false,
    isLoaded: false,
    modelId: DEFAULT_MODEL,
    useRemote: false,
    availableModels: DEFAULT_MODELS
  });

  const [metrics, setMetrics] = useState({
    accuracy: 85,
    power: 42,
    energy: 0,
    latency: 0
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('ecollm_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeRunId, setActiveRunId] = useState(() => {
    const saved = localStorage.getItem('ecollm_history');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return parsed[0]?.run_id || null;
  });

  useEffect(() => {
    localStorage.setItem('ecollm_history', JSON.stringify(history));
  }, [history]);

  const comparisonResults = activeRunId
    ? history.filter((item) => item.run_id === activeRunId)
    : [];

  const analyticsResults = comparisonResults.length > 0
    ? comparisonResults
    : [...history]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 8);

  const latestResult = comparisonResults.find((item) => item.model_id === selectedModel)
    || comparisonResults[0]
    || history[0]
    || null;

  const saveResults = (entries, runId) => {
    setHistory((prev) => [...entries, ...prev].slice(0, 100));
    setActiveRunId(runId);
  };

  const handleClearHistory = () => {
    if (!window.confirm('Clear all medical history?')) {
      return;
    }

    localStorage.removeItem('ecollm_history');
    setHistory([]);
    setActiveRunId(null);
  };

  const estimateMetrics = (modelId, requestType, data, hasError = false) => {
    if (hasError) {
      return { accuracy: 0, power: 0 };
    }

    const base = MODEL_SCORES[modelId] || { accuracy: 80, power: 65 };
    const adjustment = STRATEGY_ADJUSTMENTS[requestType] || STRATEGY_ADJUSTMENTS['zero-shot'];
    const latencyPenalty = Math.min(Math.round((data.latency || 0) * 1.5), 8);
    const energyBoost = Math.min(Math.round((data.energy || 0) * 100), 12);

    return {
      accuracy: Math.max(60, Math.min(99, base.accuracy + adjustment.accuracy - Math.floor(latencyPenalty / 2))),
      power: Math.max(20, Math.min(140, base.power + adjustment.power + energyBoost))
    };
  };

  const buildResultEntry = (requestPrompt, requestType, modelId, data, runId, hasError = false) => {
    const derivedMetrics = estimateMetrics(modelId, requestType, data, hasError);

    return {
      prompt: requestPrompt,
      prompt_type: requestType,
      model_id: modelId,
      answer: data.answer,
      latency: data.latency,
      energy: data.energy,
      tokens: data.tokens,
      accuracy: derivedMetrics.accuracy,
      power: derivedMetrics.power,
      error: hasError,
      run_id: runId,
      timestamp: new Date().toISOString()
    };
  };

  const updateMetricsFromResult = (result) => {
    setMetrics({
      accuracy: result?.accuracy || 0,
      power: result?.power || 0,
      energy: result?.energy || 0,
      latency: result?.latency || 0
    });
  };

  const requestAnalysis = async (requestPrompt, requestType, modelId) => {
    const controller = new AbortController();
    const timeoutMs = modelId === 'microsoft/phi-2' ? 45000 : 70000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: requestPrompt,
          prompt_type: requestType,
          model_id: modelId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Server connection failed');
      }

      return {
        answer: data.answer,
        latency: data.latency,
        energy: data.energy,
        tokens: data.tokens
      };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/status`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || 'Backend status check failed');
        }

        setModelStatus({
          loading: false,
          connected: true,
          isLoaded: data.is_loaded,
          modelId: data.model_id,
          useRemote: data.use_remote,
          availableModels: data.available_models || DEFAULT_MODELS
        });
        setSelectedModel(data.model_id || DEFAULT_MODEL);
      } catch (error) {
        setModelStatus({
          loading: false,
          connected: false,
          isLoaded: false,
          modelId: DEFAULT_MODEL,
          useRemote: false,
          availableModels: DEFAULT_MODELS
        });
      }
    };

    checkBackendStatus();
  }, []);

  const handleModelChange = async (nextModel) => {
    setSelectedModel(nextModel);
    setModelStatus((prev) => ({
      ...prev,
      loading: true
    }));

    try {
      const res = await fetch(`${API_BASE_URL}/models/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: '',
          prompt_type: promptType,
          model_id: nextModel
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Model load failed');
      }

      setModelStatus({
        loading: false,
        connected: true,
        isLoaded: data.is_loaded,
        modelId: data.model_id,
        useRemote: data.use_remote,
        availableModels: data.available_models || DEFAULT_MODELS
      });
    } catch (error) {
      setModelStatus((prev) => ({
        ...prev,
        loading: false,
        connected: false
      }));
      setAnswer(`Could not load ${nextModel}. Make sure the backend is running and the model is available.`);
    }
  };

  const handleAnalyze = async () => {
    if (!prompt.trim()) {
      setAnswer('Please enter a medical question.');
      return;
    }

    setAnswer('Consulting Medical AI...');
    setLoading(true);
    const runId = `run-${Date.now()}`;

    try {
      const data = await requestAnalysis(prompt, promptType, selectedModel);
      const result = buildResultEntry(prompt, promptType, selectedModel, data, runId);

      setModelStatus((prev) => ({
        ...prev,
        connected: true,
        isLoaded: true,
        modelId: selectedModel
      }));
      setAnswer(data.answer);
      updateMetricsFromResult(result);
      saveResults([result], runId);
    } catch (err) {
      if (err.name === 'AbortError') {
        setAnswer('The selected model took too long to respond. Try Phi-2 for the fastest result or use Compare All to benchmark every model.');
      } else {
        setModelStatus((prev) => ({
          ...prev,
          connected: false
        }));
        setAnswer(`Error: ${err.message || 'Could not connect to the model backend.'}`);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompareAll = async () => {
    if (!prompt.trim()) {
      setAnswer('Please enter a medical question first, then run Compare All.');
      return;
    }

    const modelsToCompare = modelStatus.availableModels?.length
      ? modelStatus.availableModels
      : DEFAULT_MODELS;
    const runId = `run-${Date.now()}`;
    const results = [];

    setComparingAll(true);
    setLoading(true);

    try {
      for (let index = 0; index < modelsToCompare.length; index += 1) {
        const model = modelsToCompare[index];
        setAnswer(`Running ${index + 1}/${modelsToCompare.length}: ${model.label}...`);

        try {
          const data = await requestAnalysis(prompt, promptType, model.id);
          const result = buildResultEntry(prompt, promptType, model.id, data, runId);
          results.push(result);
        } catch (error) {
          results.push(buildResultEntry(prompt, promptType, model.id, {
            answer: `Error: ${error.message || 'Request failed'}`,
            latency: 0,
            energy: 0,
            tokens: 0
          }, runId, true));
        }
      }

      saveResults(results, runId);
      const successful = results.filter((item) => !item.error);
      if (successful.length > 0) {
        const fastest = [...successful].sort((a, b) => a.latency - b.latency)[0];
        const lowestEnergy = [...successful].sort((a, b) => a.energy - b.energy)[0];
        const selectedResult = successful.find((item) => item.model_id === selectedModel) || fastest;

        setModelStatus((prev) => ({
          ...prev,
          connected: true,
          isLoaded: true,
          modelId: selectedResult.model_id
        }));
        updateMetricsFromResult(selectedResult);
        setAnswer(
          `Comparison complete. Fastest: ${fastest.model_id} (${fastest.latency}s). ` +
          `Lowest energy: ${lowestEnergy.model_id} (${lowestEnergy.energy} Wh).`
        );
      } else {
        setAnswer('Comparison finished, but all models returned errors. Check backend logs and token access.');
      }
    } finally {
      setComparingAll(false);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <main className="w-full max-w-[1600px] mx-auto p-4 flex-grow lg:flex lg:gap-6 lg:overflow-hidden">
        <Sidebar
          prompt={prompt}
          setPrompt={setPrompt}
          promptType={promptType}
          setPromptType={setPromptType}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          onModelChange={handleModelChange}
          onAnalyze={handleAnalyze}
          onCompareAll={handleCompareAll}
          loading={loading}
          comparingAll={comparingAll}
          modelStatus={modelStatus}
          apiUrl={API_BASE_URL}
        />

        <div className="flex-grow space-y-6 lg:overflow-y-auto lg:pr-1 custom-scrollbar">
          {!modelStatus.connected && (
            <section className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-800 text-sm text-amber-900 dark:text-amber-100">
              Frontend cannot reach the backend at <span className="font-semibold">{API_BASE_URL}</span>. Start the FastAPI server first, then refresh this page.
            </section>
          )}

          {activeView === 'dashboard' && (
            <>
              <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400 text-lg">medical_information</span>
                  Medical Diagnosis / Answer
                </h3>
                <div className="text-sm whitespace-pre-wrap break-words text-slate-700 dark:text-slate-200 min-h-[120px] max-h-[520px] overflow-y-auto bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 leading-relaxed custom-scrollbar">
                  {answer || 'Ask a medical question to get started...'}
                </div>
                {modelStatus.connected && (
                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Active model: {modelStatus.modelId}{modelStatus.useRemote ? ' (remote inference)' : ' (local inference)'}
                  </div>
                )}
                {promptType !== 'zero-shot' && (
                  <div className="mt-2 text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                    Strategy: {promptType}
                  </div>
                )}
              </section>

              <MetricsCards metrics={metrics} />

              <ComparisonTable
                results={comparisonResults}
                activePrompt={latestResult?.prompt || prompt}
                promptType={latestResult?.prompt_type || promptType}
              />
            </>
          )}

          {activeView === 'analytics' && (
            <>
              <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-sm mb-2">Analysis Graphs</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  This section is now focused on visual comparison only, with bar, line, and scatter graphs built from your latest comparison run or saved history.
                </p>
              </section>

              {analyticsResults.length === 0 ? (
                <section className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                  <h4 className="font-semibold text-sm">No analytics yet</h4>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Run an analysis or compare all models once, then this tab will fill with charts and summaries.
                  </p>
                </section>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResultsChart results={analyticsResults} />
                    <TrendLineChart results={analyticsResults} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AccuracyPowerChart results={analyticsResults} />
                    <EnergyScatter history={analyticsResults} />
                  </div>
                </>
              )}
            </>
          )}

          {activeView === 'history' && (
            <>
              <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-sm mb-2">History</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Your locally saved run history now lives here instead of the main dashboard.
                </p>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SessionSummary history={history} />
                <EnergyScatter history={history} />
              </div>

              <RankingTable history={history} onClearHistory={handleClearHistory} />
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
