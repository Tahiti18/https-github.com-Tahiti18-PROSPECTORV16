/* =========================================================
   GEMINI SERVICE – BUSINESS OPTIMIZED
   ========================================================= */

import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Lead, AssetRecord, BenchmarkReport, VeoConfig, GeminiResult, EngineResult, BrandIdentity } from "../types";
export type { Lead, AssetRecord, BenchmarkReport, VeoConfig, GeminiResult, EngineResult, BrandIdentity };

const GEMINI_MODEL = "gemini-3-flash-preview";
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const STORAGE_KEY_ASSETS = 'prospector_os_vault_v1';

// PERSISTENT ASSET STORAGE
const loadAssets = (): AssetRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ASSETS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const SESSION_ASSETS: AssetRecord[] = loadAssets();
export const PRODUCTION_LOGS: string[] = [];

/* =========================================================
   KEY STORAGE UTILITIES
   ========================================================= */

export function setStoredKeys(openRouter: string, kie: string) {
  localStorage.setItem('pomelli_or_key', openRouter);
  localStorage.setItem('pomelli_kie_key', kie);
}

export function getStoredKeys() {
  return {
    openRouter: localStorage.getItem('pomelli_or_key') || '',
    kie: localStorage.getItem('pomelli_kie_key') || ''
  };
}

/* =========================================================
   ASSET HELPERS
   ========================================================= */

const assetListeners = new Set<(assets: AssetRecord[]) => void>();

const notifyAssetListeners = () => {
  const current = [...SESSION_ASSETS];
  assetListeners.forEach(l => l(current));
  localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(current));
};

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
  
  // Deduplicate images if base64 matches exactly
  if (type === 'IMAGE' || type === 'AUDIO') {
    const exists = SESSION_ASSETS.find(a => a.data === data);
    if (exists) return exists;
  }

  SESSION_ASSETS.unshift(asset);
  notifyAssetListeners();
  return asset;
}

export function subscribeToAssets(callback: (assets: AssetRecord[]) => void) {
  assetListeners.add(callback);
  callback([...SESSION_ASSETS]);
  return () => { assetListeners.delete(callback); };
}

export function deleteAsset(id: string) {
  const idx = SESSION_ASSETS.findIndex(a => a.id === id);
  if (idx >= 0) {
    SESSION_ASSETS.splice(idx, 1);
    notifyAssetListeners();
  }
}

export function clearVault() {
  SESSION_ASSETS.length = 0;
  notifyAssetListeners();
}

export function importVault(items: AssetRecord[]) {
  SESSION_ASSETS.push(...items);
  notifyAssetListeners();
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
      error: { message: e?.message ?? "Intelligence query failed" }
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
  const prompt = `
    PREMIER ALCHEMY PROTOCOL: Conduct an exhaustive Brand DNA extraction for "${lead.businessName}".
    
    1. DOMAIN VERIFICATION (CRITICAL):
       - Confirm the OFFICIAL active website for "${lead.businessName}". Use Google Search Grounding to find the absolute correct domain if "${url}" is invalid.

    2. ASSET HARVEST (PROOF OF EXTRACTION):
       - LOCATE: exactly 10-12 legitimate, functional, high-resolution DIRECT image URLs from the website portfolio, gallery, or official Instagram.
       - IMPORTANT: Do not return placeholders. Look for real .jpg, .png, or .webp URLs in the search results or from the official site.
       - MUST INCLUDE: The main 'Hero' or 'Banner' image used on the homepage as the first item.

    3. STRATEGIC ANALYSIS:
       - IDENTIFY: Exact HEX color codes and Typographic pairings.
       - ARCHETYPE: Determine the core Jungian archetype.
       - MANIFESTO: Write a compelling 3-paragraph "Brand Manifesto".

    RETURN A HIGH-FIDELITY JSON OBJECT.
  `;

  const result = await callGemini(prompt, {
    tools: [{ googleSearch: {} }],
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        verifiedUrl: { type: Type.STRING, description: "The official verified website URL." },
        colors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of HEX codes." },
        fontPairing: { type: Type.STRING, description: "Pairing names like 'Cinzel / Inter'." },
        archetype: { type: Type.STRING },
        visualTone: { type: Type.STRING },
        tagline: { type: Type.STRING },
        mission: { type: Type.STRING },
        manifesto: { type: Type.STRING },
        targetAudiencePsychology: { type: Type.STRING },
        competitiveGapNarrative: { type: Type.STRING },
        logoUrl: { type: Type.STRING },
        extractedImages: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 10-12 real, working image URLs." }
      },
      required: ["verifiedUrl", "colors", "fontPairing", "archetype", "manifesto", "extractedImages"]
    }
  });

  if (!result.ok) {
    throw new Error(result.error?.message || "Premier Audit Failed.");
  }

  try {
    const data = JSON.parse(result.text) as BrandIdentity;
    if (data.verifiedUrl) {
      data.screenshotUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(data.verifiedUrl)}?w=1280&h=960`;
    }
    return data;
  } catch (e) {
    throw new Error("Neural response malformed during synthesis.");
  }
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
  const url = await generateVisual(`4K high-end mockup for ${name}`, { businessName: name } as Lead);
  return url || "https://via.placeholder.com/1024";
}

export async function generateFlashSparks(lead: Lead): Promise<string[]> {
  const result = await callGemini(`Creative hooks for ${lead.businessName}.`);
  return result.text.split('\n').filter(s => s.trim());
}

export async function generateOutreachSequence(lead: Lead): Promise<any[]> {
  const result = await callGemini(`5-day engagement sequence for ${lead.businessName}.`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return []; }
}

export async function generateProposalDraft(lead: Lead): Promise<string> {
  const prompt = `
    GENERATE_PROPOSAL: Create a high-fidelity strategic transformation proposal for ${lead.businessName}.
    Structure using UI_BLOCKS JSON.
  `;
  const result = await callGemini(prompt, { responseMimeType: "application/json" });
  return result.text;
}

export async function generateROIReport(ltv: number, leads: number, conv: number): Promise<string> {
  const result = await callGemini(`ROI Report: LTV=${ltv}, Monthly=${leads}, Conv=${conv}%.`);
  return result.text;
}

export async function architectFunnel(lead: Lead): Promise<any[]> {
  const result = await callGemini(`Conversion map for ${lead.businessName}.`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return []; }
}

export async function architectPitchDeck(lead: Lead): Promise<any> {
  const result = await callGemini(`Presentation structure for ${lead.businessName}.`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return {}; }
}

export async function generateTaskMatrix(lead: Lead): Promise<any[]> {
  const result = await callGemini(`Project plan for ${lead.businessName}.`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return []; }
}

export async function generateNurtureDialogue(lead: Lead, scenario: string): Promise<any[]> {
  const result = await callGemini(`Engagement dialogue for ${lead.businessName}: ${scenario}`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return []; }
}

export async function synthesizeProduct(lead: Lead): Promise<any> {
  const result = await callGemini(`Service offer for ${lead.businessName}.`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return {}; }
}

export async function openRouterChat(prompt: string, system?: string): Promise<string> {
  const result = await callGemini(prompt, { systemInstruction: system });
  return result.text;
}

export async function performFactCheck(lead: Lead, claim: string): Promise<any> {
  const result = await callGemini(`Validation check: ${claim}`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return { status: 'Unknown' }; }
}

export async function translateTactical(text: string, lang: string): Promise<string> {
  const result = await callGemini(`Localize to ${lang}: ${text}`);
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
  return (op as any).id;
}

export async function enhanceStrategicPrompt(prompt: string): Promise<string> {
  const result = await callGemini(`Refine professional prompt: ${prompt}`);
  return result.text;
}

export async function loggedGenerateContent(params: { module: string; contents: string | any; config?: any; }): Promise<string> {
  const prompt = typeof params.contents === 'string' ? params.contents : JSON.stringify(params.contents);
  const result = await callGemini(prompt, params.config);
  pushLog(`${params.module}: ${result.ok ? 'OK' : 'FAIL'}`);
  return result.text;
}

export async function generateAffiliateProgram(niche: string): Promise<any> {
  const result = await callGemini(`Partner program for ${niche}`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return {}; }
}

export async function synthesizeArticle(source: string, mode: string): Promise<string> {
  return (await callGemini(`Summary ${mode}: ${source}`)).text;
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
  return (await callGemini(`Projected Simulation: LTV=${ltv}, Vol=${volume} for ${lead.businessName}`)).text;
}

export async function generatePitch(lead: Lead): Promise<string> {
  const prompt = `TASK: Generate a definitive sales pitch for ${lead.businessName}. Return UI_BLOCKS JSON.`;
  const result = await callGemini(prompt, { responseMimeType: "application/json" });
  return result.text;
}

export async function generatePlaybookStrategy(niche: string): Promise<any> {
  const result = await callGemini(`Operations guide for ${niche}`, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return {}; }
}

export async function fetchTokenStats(): Promise<any> { return { recentOps: [] }; }

export async function critiqueVideoPresence(lead: Lead): Promise<string> {
  // Fix typo: callGemory -> callGemini
  return (await callGemini(`Creative review for ${lead.businessName}`)).text;
}

export async function enhanceVideoPrompt(prompt: string): Promise<string> {
  const result = await callGemini(`Refine visual prompt: ${prompt}`);
  return result.text;
}

export async function orchestrateBusinessPackage(lead: Lead, assets: AssetRecord[]): Promise<any> {
  const prompt = `Develop a comprehensive client engagement briefing for ${lead.businessName}.`;
  const result = await callGemini(prompt, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return { narrative: "Strategic briefing complete." }; }
}

export async function queryRealtimeAgent(query: string): Promise<{ text: string; sources: any[] }> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  return {
    text: response.text || "",
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
}

export async function testModelPerformance(model: string, prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: model as any,
    contents: prompt,
  });
  return response.text || "";
}

export async function generateMotionLabConcept(lead: Lead): Promise<any> {
  const prompt = `Create a professional storyboard for ${lead.businessName}. Return JSON.`;
  const result = await callGemini(prompt, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return null; }
}

export async function fetchViralPulseData(niche: string): Promise<any[]> {
  const prompt = `Identify top industry trends for the ${niche} sector. Return JSON array.`;
  const result = await callGemini(prompt, { responseMimeType: "application/json" });
  try {
    const parsed = JSON.parse(result.text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function generateAgencyIdentity(niche: string, region: string): Promise<any> {
  const prompt = `Generate a professional agency profile for a company in ${niche} focusing on ${region}. Return JSON.`;
  const result = await callGemini(prompt, { responseMimeType: "application/json" });
  try { return JSON.parse(result.text); } catch { return {}; }
}

export async function generateAudioPitch(script: string, voice: string, leadId?: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: script }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
          },
      },
    },
  });
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
      const dataUrl = `data:audio/pcm;base64,${base64Audio}`;
      if (leadId) saveAsset('AUDIO', `Pitch for ${leadId}`, dataUrl, 'AUDIO_STUDIO', leadId);
      return dataUrl;
  }
  throw new Error("Audio generation failed");
}
