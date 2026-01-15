import { Lead } from '../../types';
import { loggedGenerateContent } from '../geminiService';
import { safeJsonParse, validateKeys } from './jsonGuard';
import { Type } from "@google/genai";

// Standardizing on Gemini 3 Flash for V16 Automation Swarm
const ENFORCED_MODEL = "gemini-3-flash-preview";

export interface RunContext {
  identity_strict: boolean;
  compliance_mode: 'standard' | 'regulated';
  lead_evidence_level: 'high' | 'low';
}

const getSafetyInstruction = (ctx: RunContext) => `
You are a world-class marketing intelligence engine.
${ctx.identity_strict ? 'STRICT IDENTITY MODE ENABLED: Business identity is NOT fully confirmed. Require "inference labeling" for all output.' : ''}
${ctx.compliance_mode === 'regulated' ? 'REGULATED COMPLIANCE MODE ENABLED: Focus exclusively on technical marketing infrastructure and data-driven claims.' : ''}
${ctx.lead_evidence_level === 'low' ? 'LOW EVIDENCE WARNING: Prioritize factual discovery over assumptions.' : ''}
`;

const SYSTEM_BOOTSTRAP = `You are Prospector OS. You must respond ONLY with a single JSON object. Do not include markdown code blocks.`;

async function guardedGenerate<T>(
  module: string,
  model: string,
  prompt: string,
  requiredKeys: string[],
  ctx: RunContext,
  schema?: any
): Promise<{ data: T; raw: string }> {
  const finalPrompt = `${getSafetyInstruction(ctx)}\n\n${prompt}`;
  
  try {
    const lastRaw = await loggedGenerateContent({
      module, 
      contents: finalPrompt,
      config: { 
        systemInstruction: SYSTEM_BOOTSTRAP,
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const parsed = safeJsonParse<T>(lastRaw);
    if (parsed.ok) {
      const validation = validateKeys(parsed.value, requiredKeys);
      if (validation.ok) return { data: parsed.value!, raw: lastRaw };
      else console.warn(`[GuardedGenerate] Missing keys in ${module}:`, validation.missing);
    } else {
      console.warn(`[GuardedGenerate] JSON Parse Fail in ${module}:`, parsed.error);
    }
  } catch (e: any) {
    console.error(`[GuardedGenerate] Critical Fail for ${module}:`, e.message);
  }

  throw new Error(`Exhausted all recovery attempts for ${module}. Check raw logs.`);
}

export const Steps = {
  resolveLead: async (lead: Lead, ctx: RunContext) => {
    const prompt = `TASK: Normalize lead identity and confirm business details. INPUT: ${JSON.stringify(lead)}.`;
    const schema = {
      type: Type.OBJECT,
      properties: {
        resolved_lead: {
          type: Type.OBJECT,
          properties: {
            business_name: { type: Type.STRING },
            business_confirmed: { type: Type.BOOLEAN },
            industry_classification: { type: Type.STRING }
          },
          required: ["business_name", "business_confirmed"]
        }
      },
      required: ["resolved_lead"]
    };
    return guardedGenerate('RESOLVE_LEAD', ENFORCED_MODEL, prompt, ['resolved_lead.business_confirmed'], ctx, schema);
  },
  deepResearch: async (resolvedData: any, ctx: RunContext) => {
    const prompt = `TASK: Perform factual discovery on the brand's digital presence. INPUT: ${JSON.stringify(resolvedData)}.`;
    const schema = {
      type: Type.OBJECT,
      properties: {
        identity_resolution: {
          type: Type.OBJECT,
          properties: {
            business_confirmed: { type: Type.BOOLEAN }
          },
          required: ["business_confirmed"]
        },
        digital_footprint: {
          type: Type.OBJECT,
          properties: {
            website_status: { type: Type.STRING },
            social_presence: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      },
      required: ["identity_resolution"]
    };
    return guardedGenerate('DEEP_RESEARCH', ENFORCED_MODEL, prompt, ['identity_resolution.business_confirmed'], ctx, schema);
  },
  generateDeepResearchLite: async (resolvedData: any, ctx: RunContext) => {
    const prompt = `TASK: Compact factual discovery for high-speed engagement. INPUT: ${JSON.stringify(resolvedData)}.`;
    return guardedGenerate('DEEP_RESEARCH_LITE', ENFORCED_MODEL, prompt, ['identity_resolution.business_confirmed'], ctx);
  },
  extractSignals: async (researchData: any, ctx: RunContext) => {
    const prompt = `TASK: Extract high-value revenue leverage points and marketing pain signals. INPUT: ${JSON.stringify(researchData)}.`;
    const schema = {
      type: Type.OBJECT,
      properties: {
        signals: {
          type: Type.OBJECT,
          properties: {
            pain_signals: { type: Type.ARRAY, items: { type: Type.STRING } },
            growth_vectors: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["pain_signals"]
        }
      },
      required: ["signals"]
    };
    return guardedGenerate('EXTRACT_SIGNALS', ENFORCED_MODEL, prompt, ['signals.pain_signals'], ctx, schema);
  },
  governDecision: async (researchData: any, signalsData: any, ctx: RunContext) => {
    const prompt = `TASK: Arbitrate truth across data points and set strategic direction. INPUT: Research: ${JSON.stringify(researchData)}, Signals: ${JSON.stringify(signalsData)}.`;
    const schema = {
      type: Type.OBJECT,
      properties: {
        validated_intelligence: {
          type: Type.OBJECT,
          properties: {
            key_facts: { type: Type.ARRAY, items: { type: Type.STRING } },
            confidence_score: { type: Type.NUMBER }
          },
          required: ["key_facts"]
        }
      },
      required: ["validated_intelligence"]
    };
    return guardedGenerate('DECISION_GOVERNOR', ENFORCED_MODEL, prompt, ['validated_intelligence.key_facts'], ctx, schema);
  },
  synthesizeIntelligence: async (governorData: any, ctx: RunContext) => {
    const prompt = `TASK: Construct final commercial dossier for target engagement. INPUT: ${JSON.stringify(governorData)}.`;
    const schema = {
      type: Type.OBJECT,
      properties: {
        dossier: {
          type: Type.OBJECT,
          properties: {
            lead_readiness_score_0_100: { type: Type.NUMBER },
            strategic_hook: { type: Type.STRING }
          },
          required: ["lead_readiness_score_0_100"]
        }
      },
      required: ["dossier"]
    };
    return guardedGenerate('INTEL_SYNTHESIS', ENFORCED_MODEL, prompt, ['dossier.lead_readiness_score_0_100'], ctx, schema);
  },
  generateStrategy: async (dossierData: any, ctx: RunContext) => {
    const prompt = `TASK: Architect high-ticket marketing transformation blueprint. INPUT: ${JSON.stringify(dossierData)}.`;
    return guardedGenerate('GENERATE_STRATEGY', ENFORCED_MODEL, prompt, ['positioning'], ctx);
  },
  generateTextAssets: async (strategyData: any, ctx: RunContext) => {
    const prompt = `TASK: Draft deployable website copy and initial outreach templates. INPUT: ${JSON.stringify(strategyData)}.`;
    return guardedGenerate('GENERATE_TEXT_ASSETS', ENFORCED_MODEL, prompt, ['text_assets.website'], ctx);
  },
  generateSocialAssets: async (strategyData: any, ctx: RunContext) => {
    const prompt = `TASK: Generate a 30-day social media authority calendar.`;
    return guardedGenerate('GENERATE_SOCIAL_ASSETS', ENFORCED_MODEL, prompt, ['social_assets.30_day_calendar'], ctx);
  },
  generateVideoScripts: async (strategyData: any, ctx: RunContext) => {
    const prompt = `TASK: Create scripts for cinematic video advertisements.`;
    return guardedGenerate('GENERATE_VIDEO_SCRIPTS', ENFORCED_MODEL, prompt, ['video_assets.short_form'], ctx);
  },
  generateAudioAssets: async (strategyData: any, ctx: RunContext) => {
    const prompt = `TASK: Draft scripts for professional voiceover synthesis.`;
    return guardedGenerate('GENERATE_AUDIO_ASSETS', ENFORCED_MODEL, prompt, ['audio_assets.voiceovers'], ctx);
  },
  generateVisualAssets: async (strategyData: any, ctx: RunContext) => {
    const prompt = `TASK: Define art direction and image prompts for the Visual Studio.`;
    return guardedGenerate('GENERATE_VISUAL_ASSETS', ENFORCED_MODEL, prompt, ['visual_direction.brand_mood'], ctx);
  },
  assembleRun: async (context: any, ctx: RunContext) => {
    const prompt = `TASK: Finalize OS Run assembly and verify media vault staging.`;
    return guardedGenerate('ASSEMBLE_RUN', ENFORCED_MODEL, prompt, ['media_vault'], ctx);
  },
  generateICP: async (lead: Lead, strategyData: any, ctx: RunContext) => {
    const prompt = `Generate ideal customer persona for ${lead.businessName}.`;
    return guardedGenerate('ICP_GEN', ENFORCED_MODEL, prompt, ['icp'], ctx);
  },
  generateOffer: async (lead: Lead, icp: any, ctx: RunContext) => {
    const prompt = `Synthesize a high-value offer stack for ${lead.businessName}.`;
    return guardedGenerate('OFFER_GEN', ENFORCED_MODEL, prompt, ['offer'], ctx);
  },
  generateOutreach: async (lead: Lead, offer: any, ctx: RunContext) => {
    const prompt = `Draft complete outreach suite including Email, LinkedIn, and Phone scripts for ${lead.businessName}.`;
    return guardedGenerate('OUTREACH_GEN', ENFORCED_MODEL, prompt, ['outreach'], ctx);
  },
  generateFinalReport: async (lead: Lead, allData: any): Promise<string> => {
    const prompt = `Compile exhaustive Final Transformation Report for ${lead.businessName} using the collected data: ${JSON.stringify(allData)}. RETURN THE RESPONSE IN A FORMATTED UI_BLOCKS JSON STRUCTURE.`;
    return await loggedGenerateContent({
      module: 'REPORT_GEN', 
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
  }
};