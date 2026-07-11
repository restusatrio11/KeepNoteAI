// src/lib/ai.ts
import { AIResponseSchema, AIHealthSchema, AINotulenSchema, AIReviewSchema } from './validations';
import { z } from 'zod';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const SITE_NAME = 'KeepNoteAI';

/**
 * Core helper to call OpenRouter with Zod validation and Self-Correction Loop
 */
async function callOpenRouter<T>(
  prompt: string | any[], 
  schema: z.ZodSchema<T>, 
  systemPrompt: string,
  retries: number = 2,
  overrideModel?: string
): Promise<T> {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not defined');

  let lastError = '';

  for (let i = 0; i <= retries; i++) {
    try {
      const fullSystemPrompt = lastError 
        ? `${systemPrompt}\n\nIMPORTANT: Your previous response failed validation with error: ${lastError}. Please fix the JSON format and ensure it strictly follows the schema.`
        : systemPrompt;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': SITE_URL,
          'X-Title': SITE_NAME,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: overrideModel || process.env.AI_MODEL || 'openai/gpt-oss-120b:free',
          messages: [
            { role: 'system', content: fullSystemPrompt },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' }
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'OpenRouter API Error');
      
      const content = data.choices[0].message.content;
      const cleanedContent = content.replace(/```json|```/g, '').trim();
      
      try {
        const parsed = JSON.parse(cleanedContent);
        return schema.parse(parsed);
      } catch (parseErr: any) {
        lastError = parseErr.message;
        if (i === retries) throw parseErr;
        console.warn(`AI Validation failed (Attempt ${i+1}/${retries+1}): ${lastError}. Retrying...`);
      }
    } catch (error: any) {
      if (i === retries) throw error;
      lastError = error.message;
    }
  }
  throw new Error('Failed to get valid response from AI after multiple attempts');
}

/**
 * Generate professional report with Context (Memory)
 */
export async function generateReport(
  deskripsi: string, 
  timContext?: string, 
  rencanaContext?: string,
  history?: string
) {
  const systemPrompt = `You are a professional reporting assistant. 
  Convert casual daily work descriptions into formal, professional Indonesian language.
  Respond ONLY with a JSON object.
  Format: { "kegiatan": "string", "capaian": "string" }`;

  const userPrompt = `
  Context:
  Tim: ${timContext || 'General'}
  Program: ${rencanaContext || 'General'}
  
  ${history ? `Recent History Reference (Memory):\n${history}\n` : ''}
  
  User Input: "${deskripsi}"
  
  Please provide a professional version of this activity and its achievement.`;

  return callOpenRouter(userPrompt, AIResponseSchema, systemPrompt);
}

/**
 * Analyze work quality (Agentic Supervisor)
 */
export async function reviewReport(kegiatan: string, progress: string, capaian: string) {
  const systemPrompt = `You are a strict work supervisor. 
  Analyze if the work description matches the progress percentage and achievement quality.
  Provide feedback in Indonesian.
  Respond ONLY with a JSON object.
  Format: { "isAppropriate": boolean, "feedback": "string", "suggestions": "string" }`;

  const userPrompt = `
  Activity: ${kegiatan}
  Progress: ${progress}
  Achievement: ${capaian}
  
  Is this report high quality and realistic?`;

  return callOpenRouter(userPrompt, AIReviewSchema, systemPrompt);
}

/**
 * Health check AI
 */
export async function analyzeHealth(reportSummary: string) {
  const systemPrompt = `Analyze health markers and give professional performance advice based on report history.
  Respond ONLY with a JSON object.
  Format: { "status": "string", "message": "string", "score": number }`;
  
  return callOpenRouter(reportSummary, AIHealthSchema, systemPrompt);
}

/**
 * Parse raw report from OCR/Chat
 */
export async function parseRawReport(text: string) {
  const systemPrompt = `Extract work activities from unstructured text.
  Respond ONLY with a JSON object.
  Format: { "kegiatan": "string", "capaian": "string", "progress": "string" }`;

  return callOpenRouter(text, AIResponseSchema, systemPrompt);
}

/**
 * Analyze image or document for activity report (OCR + Description)
 */
export async function analyzeImageReport(base64Image: string, contentType: string, rencanaContext?: string) {
  const systemPrompt = `Analyze the image or document and provide a professional activity description.
  Respond ONLY with a JSON object.
  Format: { "kegiatan": "string", "capaian": "string" }`;

  const userPrompt = [
    { type: 'text', text: `Context: ${rencanaContext || 'General'}. Analyze this and summarize professional activity.` },
    { type: 'image_url', image_url: { url: `data:${contentType};base64,${base64Image}` } }
  ];

  return callOpenRouter(userPrompt, AIResponseSchema, systemPrompt);
}

/**
 * Generate meeting notes from text
 */
export async function generateMeetingNotes(text: string, metadata?: any) {
  const systemPrompt = `You are a professional meeting minute taker.
  Format: { "judul": "string", "kesimpulan": "string", "pembahasan": [{ "topik": "string", "items": [{ "deskripsi": "string", "solusi": "string" }] }], "insights": ["string"] }`;

  const userPrompt = `
  Meeting Info: ${JSON.stringify(metadata || {})}
  Notes/Transcript: ${text}
  
  Please provide a structured professional meeting summary.`;

  return callOpenRouter(userPrompt, AINotulenSchema, systemPrompt);
}

/**
 * Audio transcription and summarization (Multimodal)
 */
export async function processMeetingAudio(base64Audio: string, contentType: string, metadata?: any) {
  const systemPrompt = `You are an AI that analyzes meeting audio recordings.
  Transcribe and then summarize the meeting into structured professional notes.
  Respond ONLY with a JSON object.
  Format: { "judul": "string", "kesimpulan": "string", "pembahasan": [{ "topik": "string", "items": [{ "deskripsi": "string", "solusi": "string" }] }], "insights": ["string"] }`;

  const userPrompt = [
    { type: 'text', text: `Meeting Context: ${JSON.stringify(metadata || {})}. Analyze the audio and provide minutes.` },
    { 
      type: 'input_file', 
      input_file: { 
        data: base64Audio, 
        mime_type: contentType 
      } 
    }
  ];
  
  // Audio requires Gemini specifically on OpenRouter
  return callOpenRouter(userPrompt as any, AINotulenSchema, systemPrompt, 2, 'google/gemini-2.0-flash-lite-preview-02-05:free');
}
