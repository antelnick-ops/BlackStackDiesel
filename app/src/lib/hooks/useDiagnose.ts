import { useState } from 'react';
import { hardStartDiagnosis, type DiagnosisResponse } from '@/lib/mock-data/diagnoses';
import type { Vehicle } from '@/types/vehicle';

// Phase 2: mock implementation. Phase 4 swaps this for the real AI call;
// same input/output shape so the swap is a one-file change.
export function useDiagnose() {
  const [loading, setLoading] = useState(false);

  const diagnose = async (_vehicle: Vehicle | null, _message: string): Promise<DiagnosisResponse> => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    return hardStartDiagnosis;
  };

  return { loading, diagnose };
}
