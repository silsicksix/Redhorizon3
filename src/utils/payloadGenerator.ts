
import { Node, ProfilerResult } from '../types';

export const generateArenaStylometryPayload = (targets: { label: string, samples: string }[], geminiAnalysis?: any) => {
  return `
ACT AS: Senior Forensic Linguist & Intelligence Auditor.
MISSION: Perform a Cross-Intelligence Validation (CIV) on the following data.

RAW SAMPLES:
${targets.map(t => `[TARGET: ${t.label}]\n"${t.samples}"`).join('\n\n')}

${geminiAnalysis ? `PRELIMINARY AI FINDINGS (INTERNAL SCAN):
${JSON.stringify(geminiAnalysis, null, 2)}` : ''}

TASK OBJECTIVES:
1. Audit the linguistic idiolect of each sample.
2. Identify patterns of "Mimicry Deception" (is the user trying to hide their identity?).
3. Compare with Internal findings: Do you agree or disagree with the preliminary match score? Provide reasons.
4. Detect "Leaked Context": Are there any geographical or temporal clues hidden in the syntax?

FORMAT: Provide a "Tactical Briefing" response. Focus on contradictions found in the data.
  `.trim();
};

export const generateScenarioPayload = (target: Node, profile?: ProfilerResult) => {
  return `
ACT AS: Operational Strategist.
CONTEXT: We are investigating an entity named "${target.label}".
PROFILE DATA: ${profile ? JSON.stringify(profile) : 'Unknown'}

MISSION: 
1. Simulate 3 potential scenarios where this target would be forced to reveal their true digital footprint.
2. Recommend a custom "Pretext" for a social engineering contact that matches their psychological profile.
3. List 5 high-value data points we are likely missing based on their current behavior.
  `.trim();
};
