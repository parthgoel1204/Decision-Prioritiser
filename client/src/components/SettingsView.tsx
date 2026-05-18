import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface SettingsViewProps {
  onWeightsUpdated: () => void;
}

interface Weights {
  impact_weight: number;
  urgency_weight: number;
  learning_weight: number;
  risk_weight: number;
  energy_weight: number;
}

const dimensionLabels: Record<string, { label: string; emoji: string; description: string }> = {
  impact_weight: { label: 'Impact', emoji: '💥', description: 'How much does this move the needle?' },
  urgency_weight: { label: 'Urgency', emoji: '⏰', description: 'How time-sensitive is this?' },
  learning_weight: { label: 'Learning', emoji: '📚', description: 'How much will you grow from this?' },
  risk_weight: { label: 'Risk Reduction', emoji: '🛡️', description: 'Does this prevent future problems?' },
  energy_weight: { label: 'Energy', emoji: '⚡', description: 'Do you have the energy for this now?' },
};

export default function SettingsView({ onWeightsUpdated }: SettingsViewProps) {
  const [weights, setWeights] = useState<Weights>({
    impact_weight: 30,
    urgency_weight: 20,
    learning_weight: 15,
    risk_weight: 15,
    energy_weight: 20,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [exporting, setExporting] = useState(false);

  const fetchWeights = useCallback(async () => {
    try {
      const res = await axios.get('/api/weights');
      if (res.data.weights) {
        setWeights({
          impact_weight: res.data.weights.impact_weight,
          urgency_weight: res.data.weights.urgency_weight,
          learning_weight: res.data.weights.learning_weight,
          risk_weight: res.data.weights.risk_weight,
          energy_weight: res.data.weights.energy_weight,
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchWeights();
  }, [fetchWeights]);

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  const handleWeightChange = (key: keyof Weights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post('/api/weights', weights);
      setSaved(true);
      onWeightsUpdated();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setWeights({
      impact_weight: 30,
      urgency_weight: 20,
      learning_weight: 15,
      risk_weight: 15,
      energy_weight: 20,
    });
    setSaved(false);
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const res = await axios.get(`/api/export?format=${format}`, { responseType: 'blob' });
      const blob = new Blob([res.data], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decision-prioritiser-export.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Weight Customisation */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">⚙️</span>
          <h2 className="text-lg font-semibold text-foreground">Recommendation Weights</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Adjust how much each dimension influences your task recommendations. Higher weight = more influence.
        </p>

        <div className="space-y-5">
          {(Object.keys(dimensionLabels) as (keyof Weights)[]).map((key) => {
            const info = dimensionLabels[key];
            const value = weights[key];
            const percentage = totalWeight > 0 ? Math.round((value / totalWeight) * 100) : 0;

            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{info.emoji}</span>
                    <span className="text-sm font-medium text-foreground">{info.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{percentage}%</span>
                    <span className="text-sm font-bold text-foreground bg-accent px-2 py-0.5 rounded-md min-w-[2rem] text-center">
                      {value}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{info.description}</p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={value}
                  onChange={(e) => handleWeightChange(key, Number(e.target.value))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Total: {totalWeight} {totalWeight !== 100 && '(percentages auto-adjust)'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-border
                         text-muted-foreground hover:bg-accent transition-all"
            >
              Reset Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground
                         hover:opacity-90 transition-all active:scale-[0.97] disabled:opacity-50
                         hover:shadow-lg hover:shadow-primary/25"
            >
              {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Weights'}
            </button>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🎨</span>
          <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Customize how the app looks.</p>

        <div className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{darkMode ? '🌙' : '☀️'}</span>
            <div>
              <div className="text-sm font-medium text-foreground">{darkMode ? 'Dark Mode' : 'Light Mode'}</div>
              <div className="text-xs text-muted-foreground">
                {darkMode ? 'Easy on the eyes' : 'Bright and clear'}
              </div>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
              darkMode ? 'bg-primary' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                darkMode ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Export */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">📦</span>
          <h2 className="text-lg font-semibold text-foreground">Export Data</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Download all your tasks, history, and settings. Your data belongs to you.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => handleExport('json')}
            disabled={exporting}
            className="flex-1 py-3 text-sm font-medium rounded-xl border border-border
                       hover:bg-accent transition-all active:scale-[0.97] disabled:opacity-50"
          >
            📄 Export JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex-1 py-3 text-sm font-medium rounded-xl border border-border
                       hover:bg-accent transition-all active:scale-[0.97] disabled:opacity-50"
          >
            📊 Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
