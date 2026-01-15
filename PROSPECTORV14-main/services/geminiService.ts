/* =========================================================
   GEMINI SERVICE – NATIVE PREVIEW OPTIMIZED
   ========================================================= */

import { GoogleGenAI, Type } from "@google/genai";
import { Lead, AssetRecord, BenchmarkReport, VeoConfig, GeminiResult, EngineResult, BrandIdentity } from "../types";
export type { Lead, AssetRecord, BenchmarkReport, VeoConfig, GeminiResult, EngineResult, BrandIdentity };

const GEMINI_MODEL = "gemini-3-flash-preview";
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const SESSION_ASSETS: AssetRecord[] = [];
export const PRODUCTION_LOGS: string[] = [];

/* =========================================================
   ASSET HELPERS
   ========================================================= */

export function saveAsset(
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO',
  title: string,
  data: string,
  module: string,
  leadId?: string,
  metadata?: any
): AssetRecord {
  const asset: AssetRecord = {
    id: `ASSET-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    type: type as any,
    title,
    data,
    timestamp: Date.now(),
    module,
    leadId,
    metadata
  };
  SESSION_ASSETS.push(asset);
  assetListeners.forEach(l => l([...SESSION_ASSETS]));
  return asset;
}

const assetListeners = new Set<(assets: AssetRecord[]) => void>();

export function subscribeToAssets(callback: (assets: AssetRecord[]) => void) {
  assetListeners.add(callback);
  callback([...SESSION_ASSETS]);
  return () => { assetListeners.delete(callback); };
}

export function deleteAsset(id: string) {
  const idx = SESSION_ASSETS.findIndex(a => a.id === id);
  if (idx >= 0) {
    SESSION_ASSETS.splice(idx, 1);
    assetListeners.forEach(l => l([...SESSION_ASSETS]));
  }
}

export function clearVault() {
  SESSION_ASSETS.length = 0;
  assetListeners.forEach(l => l([...SESSION_ASSETS]));
}

export function importVault(items: AssetRecord[]) {
  SESSION_ASSETS.push(...items);
  assetListeners.forEach(l => l([...SESSION_ASSETS]));
}

export function pushLog(message: string) {
  PRODUCTION_LOGS.push(`[${new Date().toLocaleTimeString()}] ${message}`);
}

async function callGemini(prompt: string, config?: any): Promise<GeminiResult<string>> {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: config
    });
    return {
      ok: true,
      text: response.text || "",
      raw: response
    };
  } catch (e: any) {
    return {
      ok: false,
      text: "",
      raw: null,
      error: { message: e?.message ?? "Gemini call failed" }
    };
  }
}

/* =========================================================
   CORE GENERATORS
   ========================================================= */

export async function generateLeads(market: string, niche: string, count: number): Promise<EngineResult> {
  const prompt = `Find ${count} high-ticket businesses in ${market} specifically in the ${niche} niche that could benefit from AI transformation.`;
  
  const result = await callGemini(prompt, { 
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        leads: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              businessName: { type: Type.STRING },
              websiteUrl: { type: Type.STRING },
              niche: { type: Type.STRING },
              city: { type: Type.STRING },
              phone: { type: Type.STRING },
              email: { type: Type.STRING },
              leadScore: { type: Type.NUMBER },
              assetGrade: { type: Type.STRING },
              socialGap: { type: Type.STRING },
              visualProof: { type: Type.STRING },
              bestAngle: { type: Type.STRING },
              personalizedHook: { type: Type.STRING },
            },
            required: ["businessName", "websiteUrl", "niche", "city", "leadScore", "assetGrade", "socialGap"],
          }
        },
        rubric: {
          type: Type.OBJECT,
          properties: {
            visual: { type: Type.STRING },
            social: { type: Type.STRING },
            highTicket: { type: Type.STRING },
            reachability: { type: Type.STRING },
            grades: {
              type: Type.OBJECT,
              properties: {
                A: { type: Type.STRING },
                B: { type: Type.STRING },
                C: { type: Type.STRING },
              }
            }
          }
        },
        assets: {
          type: Type.OBJECT,
          properties: {
            emailOpeners: { type: Type.ARRAY, items: { type: Type.STRING } },
            fullEmail: { type: Type.STRING },
            callOpener: { type: Type.STRING },
            voicemail: { type: Type.STRING },
            smsFollowup: { type: Type.STRING },
          }
        }
      },
      required: ["leads", "rubric", "assets"]
    }
  });

  if (!result.ok) return { leads: [], rubric: {} as any, assets: {} as any };

  try {
    return JSON.parse(result.text);
  } catch (e) {
    return { leads: [], rubric: {} as any, assets: {} as any };
  }
}

export async function groundedLeadSearch(query: string, market: string, count: number): Promise<EngineResult> {
  return generateLeads(market, query, count);
}

export async function fetchLiveIntel(lead: Lead, module: string): Promise<BenchmarkReport> {
  const prompt = `Analyze market intel for ${lead.businessName} in ${module}.`;
  const result = await callGemini(prompt, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return {} as BenchmarkReport; }
}

export async function analyzeLedger(leads: Lead[]): Promise<{ risk: string; opportunity: string }> {
  const prompt = `Analyze leads: ${JSON.stringify(leads)}. Return JSON {risk, opportunity}.`;
  const result = await callGemini(prompt, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return { risk: "N/A", opportunity: "N/A" }; }
}

export async function fetchBenchmarkData(lead: Lead): Promise<BenchmarkReport> {
  return fetchLiveIntel(lead, "BENCHMARK");
}

export async function extractBrandDNA(lead: Lead, url: string): Promise<BrandIdentity> {
  const prompt = `Extract DNA from ${url}.`;
  const result = await callGemini(prompt, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return {} as BrandIdentity; }
}

export async function generateVisual(prompt: string, lead: Lead, sourceImage?: string): Promise<string | undefined> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: prompt
  });
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return undefined;
}

export async function generateMockup(name: string, niche: string, leadId: string): Promise<string> {
  const url = await generateVisual(`4K mockup for ${name}`, { businessName: name } as Lead);
  return url || "https://via.placeholder.com/1024";
}

export async function generateFlashSparks(lead: Lead): Promise<string[]> {
  const result = await callGemini(`Viral sparks for ${lead.businessName}.`);
  return result.text.split('\n').filter(s => s.trim());
}

export async function generateOutreachSequence(lead: Lead): Promise<any[]> {
  const result = await callGemini(`5-day sequence for ${lead.businessName}.`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return []; }
}

/**
 * Generates a structured high-ticket proposal.
 * Uses a deep structural JSON output for FormattedOutput.
 */
export async function generateProposalDraft(lead: Lead): Promise<string> {
  const prompt = `
    GENERATE_PROPOSAL_V15: Create a high-fidelity strategic transformation proposal for ${lead.businessName}.
    
    Structure the response using this EXACT UI_BLOCKS JSON schema:
    {
      "format": "ui_blocks",
      "title": "STRATEGIC TRANSFORMATION PROPOSAL",
      "subtitle": "PREPARED FOR: ${lead.businessName.toUpperCase()}",
      "sections": [
        {
          "heading": "EXECUTIVE SUMMARY",
          "body": [
            { "type": "hero", "content": "Autonomous growth architecture designed to eliminate visual friction and automate market dominance." },
            { "type": "p", "content": "Detailed overview of why now is the time for ${lead.businessName} to pivot to an AI-first brand strategy." }
          ]
        },
        {
          "heading": "DETECTED VULNERABILITIES",
          "body": [
             { "type": "heading", "content": "THE SOCIAL AUTHORITY GAP" },
             { "type": "p", "content": "${lead.socialGap}" },
             { "type": "bullets", "content": ["Static engagement patterns", "Outdated visual hierarchy", "Manual reporting latency"] }
          ]
        },
        {
          "heading": "SOLUTION ARCHITECTURE",
          "body": [
            { "type": "heading", "content": "PHASE 1: NEURAL REBRANDING" },
            { "type": "p", "content": "Deploying 4K visual assets and cinematic video payloads to establish immediate dominance." },
            { "type": "heading", "content": "PHASE 2: AUTOMATED PIPELINE" },
            { "type": "p", "content": "Integration of the AI Concierge and multi-channel outreach engine." }
          ]
        },
        {
          "heading": "ROI PROJECTION",
          "body": [
            { "type": "p", "content": "Financial modeling based on industry benchmarks for ${lead.niche}." },
            { "type": "bullets", "content": ["90% reduction in reporting overhead", "3.5x increase in qualified inquiry rate", "Consistent global brand synchronization"] }
          ]
        }
      ]
    }
  `;

  const result = await callGemini(prompt, { responseMimeType: "application/json" });
  return result.text;
}

export async function generateROIReport(ltv: number, leads: number, conv: number): Promise<string> {
  const result = await callGemini(`ROI Report: LTV=${ltv}, Monthly=${leads}, Conv=${conv}%.`);
  return result.text;
}

export async function architectFunnel(lead: Lead): Promise<any[]> {
  const result = await callGemini(`Funnel for ${lead.businessName}.`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return []; }
}

export async function architectPitchDeck(lead: Lead): Promise<any> {
  const result = await callGemini(`Pitch deck for ${lead.businessName}.`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return {}; }
}

export async function generateTaskMatrix(lead: Lead): Promise<any[]> {
  const result = await callGemini(`Task matrix for ${lead.businessName}.`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return []; }
}

export async function generateNurtureDialogue(lead: Lead, scenario: string): Promise<any[]> {
  const result = await callGemini(`Nurture for ${lead.businessName}: ${scenario}`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return []; }
}

export async function synthesizeProduct(lead: Lead): Promise<any> {
  const result = await callGemini(`Offer for ${lead.businessName}.`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return {}; }
}

export async function openRouterChat(prompt: string, system?: string): Promise<string> {
  const result = await callGemini(prompt, { systemInstruction: system });
  return result.text;
}

export async function performFactCheck(lead: Lead, claim: string): Promise<any> {
  const result = await callGemini(`Fact check: ${claim}`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return { status: 'Unknown' }; }
}

export async function translateTactical(text: string, lang: string): Promise<string> {
  const result = await callGemini(`Translate to ${lang}: ${text}`);
  return result.text;
}

export async function analyzeVisual(base64: string, mimeType: string, prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }
  });
  return response.text;
}

export async function analyzeVideoUrl(url: string, mission: string, leadId?: string): Promise<string> {
  const result = await callGemini(`Analyze video ${url} for ${mission}`);
  return result.text;
}

export async function generateVideoPayload(prompt: string, leadId?: string, image?: string, lastFrame?: string, config?: VeoConfig): Promise<string> {
  const op = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: config?.aspectRatio || '16:9' }
  });
  return op.id;
}

export async function enhanceVideoPrompt(prompt: string): Promise<string> {
  const result = await callGemini(`Enhance prompt: ${prompt}`);
  return result.text;
}

export async function generateMotionLabConcept(lead: Lead): Promise<any> {
  const result = await callGemini(`Storyboard for ${lead.businessName}`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return {}; }
}

export async function generateAgencyIdentity(niche: string, region: string): Promise<any> {
  const result = await callGemini(`Agency in ${region}, ${niche}`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return {}; }
}

/**
 * Orchestrates a high-fidelity campaign package for a lead.
 * This is the primary intelligence engine for the Campaign Architect.
 */
export async function orchestrateBusinessPackage(lead: Lead, assets: AssetRecord[]): Promise<any> {
  const prompt = `
    MISSION_ORCHESTRATION_V15: Perform exhaustive strategic architecture for ${lead.businessName}.
    
    CLIENT_PROFILE:
    - Business: ${lead.businessName}
    - Niche: ${lead.niche}
    - Market Gaps: ${lead.socialGap}
    - Existing Signals: ${lead.visualProof}
    - Key Contact: ${lead.email}

    TASK: Generate a multi-layered campaign that targets their specific "Social Deficit" and "Visual Gap."
    Ensure the Brand Style Guide includes specific HEX codes and high-level typography.
    The Outreach must include Email, LinkedIn, and a Phone script.
    The Funnel must be a 5-step detailed conversion roadmap.
  `;

  const result = await callGemini(prompt, { 
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        presentation: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: { type: Type.STRING, description: "e.g. MARKET_FORCES, SOLUTION, ROI, ROADMAP" },
                  bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                  insight: { type: Type.STRING, description: "The deep 'why' behind this slide." }
                },
                required: ["title", "bullets", "category"]
              }
            }
          },
          required: ["title", "slides"]
        },
        narrative: { type: Type.STRING },
        contentPack: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              platform: { type: Type.STRING },
              type: { type: Type.STRING, description: "e.g. HOOK, EDUCATION, PROOF" },
              caption: { type: Type.STRING },
              visualDirective: { type: Type.STRING }
            },
            required: ["platform", "type", "caption"]
          }
        },
        funnel: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              conversionGoal: { type: Type.STRING },
              frictionFix: { type: Type.STRING, description: "How AI removes the specific sales hurdle." }
            },
            required: ["title", "description", "conversionGoal"]
          }
        },
        outreach: {
          type: Type.OBJECT,
          properties: {
            emailSequence: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  body: { type: Type.STRING }
                },
                required: ["subject", "body"]
              }
            },
            linkedinSequence: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: "e.g. CONNECTION_REQUEST, FOLLOW_UP" },
                  message: { type: Type.STRING }
                }
              }
            },
            callScript: {
              type: Type.OBJECT,
              properties: {
                opener: { type: Type.STRING },
                hook: { type: Type.STRING },
                closing: { type: Type.STRING }
              }
            }
          },
          required: ["emailSequence", "linkedinSequence", "callScript"]
        },
        visualDirection: {
          type: Type.OBJECT,
          properties: {
            brandMood: { type: Type.STRING },
            colorPalette: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  color: { type: Type.STRING },
                  hex: { type: Type.STRING },
                  logic: { type: Type.STRING }
                }
              }
            },
            typography: {
              type: Type.OBJECT,
              properties: {
                heading: { type: Type.STRING },
                body: { type: Type.STRING }
              }
            },
            aiImagePrompts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  use_case: { type: Type.STRING },
                  prompt: { type: Type.STRING }
                },
                required: ["use_case", "prompt"]
              }
            }
          },
          required: ["brandMood", "colorPalette", "typography", "aiImagePrompts"]
        }
      },
      required: ["presentation", "narrative", "contentPack", "funnel", "outreach", "visualDirection"]
    }
  });

  if (!result.ok) return {};
  try {
    return JSON.parse(result.text);
  } catch (e) {
    return {};
  }
}

export async function fetchViralPulseData(niche: string): Promise<any[]> {
  const result = await callGemini(`Trends in ${niche}`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return []; }
}

export async function queryRealtimeAgent(prompt: string): Promise<{ text: string, sources: any[] }> {
  const result = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] }
  });
  return {
    text: result.text || "",
    sources: result.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
}

export async function testModelPerformance(model: string, prompt: string): Promise<string> {
  return (await callGemini(prompt)).text;
}

export function getStoredKeys() {
  return { openRouter: "PLATFORM_MANAGED", kie: "PLATFORM_MANAGED" };
}

export function setStoredKeys(orKey: string, kieKey: string) { return true; }

export async function loggedGenerateContent(params: { module: string; contents: string | any; config?: any; }): Promise<string> {
  const prompt = typeof params.contents === 'string' ? params.contents : JSON.stringify(params.contents);
  const result = await callGemini(prompt, params.config);
  pushLog(`${params.module}: ${result.ok ? 'OK' : 'FAIL'}`);
  return result.text;
}

export async function generateAffiliateProgram(niche: string): Promise<any> {
  const result = await callGemini(`Affiliate for ${niche}`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return {}; }
}

export async function synthesizeArticle(source: string, mode: string): Promise<string> {
  return (await callGemini(`Article ${mode}: ${source}`)).text;
}

export async function crawlTheaterSignals(sector: string, signal: string): Promise<Lead[]> {
  const res = await generateLeads(sector, signal, 5);
  return res.leads;
}

export async function identifySubRegions(theater: string): Promise<string[]> {
  const result = await callGemini(`Regions for ${theater}`);
  return result.text.split('\n').filter(s => s.trim());
}

export async function simulateSandbox(lead: Lead, ltv: number, volume: number): Promise<string> {
  return (await callGemini(`Sandbox: LTV=${ltv}, Vol=${volume} for ${lead.businessName}`)).text;
}

/**
 * Generates an high-impact elevator pitch suite.
 * Returns structured JSON for FormattedOutput.
 */
export async function generatePitch(lead: Lead): Promise<string> {
  const prompt = `
    TASK: Generate a definitive pitch script for ${lead.businessName}.
    Structure the response using this EXACT UI_BLOCKS JSON schema:
    {
      "format": "ui_blocks",
      "title": "PITCH GENERATOR",
      "subtitle": "ELEVATOR SCRIPTS FOR ${lead.businessName.toUpperCase()}",
      "sections": [
        {
          "heading": "1. THE CLIENT PITCH (B2B)",
          "body": [
            { "type": "hero", "content": "Why they should hire you for AI transformation." },
            { "type": "p", "content": "Concise, 30-second high-impact script focused on ROI and competitive advantage." }
          ]
        },
        {
          "heading": "2. THE CANDIDATE PITCH",
          "body": [
            { "type": "p", "content": "How to attract top-tier talent to ${lead.businessName} by selling the vision." }
          ]
        },
        {
          "heading": "3. THE COLD OPENER",
          "body": [
            { "type": "bullets", "content": ["Immediate value hook", "Vulnerability reference", "Call-to-action"] }
          ]
        }
      ]
    }
  `;
  const result = await callGemini(prompt, { responseMimeType: "application/json" });
  return result.text;
}

export async function generatePlaybookStrategy(niche: string): Promise<any> {
  const result = await callGemini(`Playbook for ${niche}`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return {}; }
}

export async function fetchTokenStats(): Promise<any> { return { recentOps: [] }; }

export async function critiqueVideoPresence(lead: Lead): Promise<string> {
  return (await callGemini(`Critique video for ${lead.businessName}`)).text;
}

export async function generateAudioPitch(script: string, voice: string, leadId?: string): Promise<string> {
  return "PLATFORM_TTS_ACTIVE";
}

export async function enhanceStrategicPrompt(prompt: string): Promise<string> {
  return (await callGemini(`Enhance strategic prompt: ${prompt}`)).text;
}