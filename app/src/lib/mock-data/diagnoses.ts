import type { Part } from '@/types/part';
import { diagnoseRecommendedParts } from './parts';

export const diagnoseSuggestionChips = [
  'Hard start when cold',
  'White smoke at idle',
  'Glow plug code',
  'Boost leak',
];

export type Confidence = 'High confidence' | 'Medium confidence' | 'Low confidence';

export interface DiagnosisResponse {
  text: string;
  confidence: Confidence;
  steps: string[];
  parts: Part[];
}

export const initialAIMessage = (vehicleName: string): string =>
  `Hey — describe what's going on with ${vehicleName}. Sound, smell, when it happens, any codes you've pulled. The more detail, the better the diagnosis.`;

// Phase 2: single canned response, returned regardless of user input.
// Phase 4 expands this into a keyed dictionary indexed by symptom tags.
export const hardStartDiagnosis: DiagnosisResponse = {
  text: `Hard cold-starts on a 7.3L almost always come down to one of three things: the IPR (Injection Pressure Regulator) valve sticking, the ICP (Injection Control Pressure) sensor going bad, or stuck injectors from fuel sitting too long. Most likely culprit on a truck Bertha's age: IPR valve.`,
  confidence: 'High confidence',
  steps: [
    'Hook up a scan tool (your Bully Dog GT works) and pull live ICP readings',
    'At cranking, ICP should hit 500+ PSI within 1–2 seconds',
    'If pressure builds slow or stalls, IPR is your culprit',
    "If pressure builds but truck won't start, suspect ICP sensor or injectors",
  ],
  parts: diagnoseRecommendedParts,
};
