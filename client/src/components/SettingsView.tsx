import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings, Palette, Download, RotateCcw, Save, Moon, Sun, FileJson, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsViewProps { onWeightsUpdated: () => void; }

interface Weights {
  impact_weight: number; urgency_weight: number; learning_weight: number;
  risk_weight: number; energy_weight: number;
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
    impact_weight: 30, urgency_weight: 20, learning_weight: 15, risk_weight: 15, energy_weight: 20,
  });
  const [saving, setSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [exporting, setExporting] = useState(false);

  const fetchWeights = useCallback(async () => {
    try {
      const res = await axios.get('/api/weights');
      if (res.data.weights) {
        setWeights({
          impact_weight: res.data.weights.impact_weight, urgency_weight: res.data.weights.urgency_weight,
          learning_weight: res.data.weights.learning_weight, risk_weight: res.data.weights.risk_weight,
          energy_weight: res.data.weights.energy_weight,
        });
      }
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchWeights(); }, [fetchWeights]);

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  const handleWeightChange = (key: keyof Weights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post('/api/weights', weights);
      toast.success('Weights saved successfully');
      onWeightsUpdated();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save weights');
    } finally { setSaving(false); }
  };

  const handleReset = () => {
    setWeights({ impact_weight: 30, urgency_weight: 20, learning_weight: 15, risk_weight: 15, energy_weight: 20 });
    toast.info('Weights reset to defaults (save to apply)');
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    toast.success(newMode ? 'Dark mode enabled' : 'Light mode enabled');
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const res = await axios.get(`/api/export?format=${format}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decision-prioritiser-export.${format}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally { setExporting(false); }
  };

  return (
    <div className="space-y-6">
      {/* Weight Customisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Recommendation Weights</CardTitle>
          <CardDescription>Adjust how much each dimension influences your task recommendations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(Object.keys(dimensionLabels) as (keyof Weights)[]).map((key) => {
            const info = dimensionLabels[key];
            const value = weights[key];
            const percentage = totalWeight > 0 ? Math.round((value / totalWeight) * 100) : 0;
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm">
                    <span>{info.emoji}</span> {info.label}
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{percentage}%</span>
                    <Badge variant="secondary" className="font-mono min-w-[2.5rem] justify-center">{value}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{info.description}</p>
                <Slider min={0} max={100} step={1} value={[value]} onValueChange={([v]) => handleWeightChange(key, v)} />
              </div>
            );
          })}

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total: {totalWeight}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}><RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}><Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Appearance</CardTitle>
          <CardDescription>Customize how the app looks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <div>
                <div className="text-sm font-medium">{darkMode ? 'Dark Mode' : 'Light Mode'}</div>
                <div className="text-xs text-muted-foreground">{darkMode ? 'Easy on the eyes' : 'Bright and clear'}</div>
              </div>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Export Data</CardTitle>
          <CardDescription>Download all your tasks, history, and settings. Your data belongs to you.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => handleExport('json')} disabled={exporting}>
              <FileJson className="h-4 w-4 mr-2" /> Export JSON
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => handleExport('csv')} disabled={exporting}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
