import { useState } from "react";
import axios from "axios";

interface Scores {
  impact:   number;
  urgency:  number;
  learning: number;
  risk:     number;
  energy:   number;
}

interface Reasons {
  impact:   string;
  urgency:  string;
  learning: string;
  risk:     string;
  energy:   string;
}

interface SuggestionResponse extends Scores {
  reasons: Reasons;
}

export function useScoreSuggestion(
  onScoresSuggested: (scores: Scores) => void
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [reasons,   setReasons]   = useState<Reasons | null>(null);

  async function suggestScores(title: string, description: string) {
    if (!title.trim()) return;

    setIsLoading(true);
    setError(null);
    setReasons(null);

    try {
      const token = localStorage.getItem("token");

      const res = await axios.post<SuggestionResponse>(
        "/api/ai/suggest-scores",
        { title, description },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const { impact, urgency, learning, risk, energy, reasons } = res.data;

      onScoresSuggested({ impact, urgency, learning, risk, energy });

      setReasons(reasons);
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        "Could not generate suggestions. Please score manually.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function clearSuggestion() {
    setReasons(null);
    setError(null);
  }

  return { isLoading, error, reasons, suggestScores, clearSuggestion };
}
