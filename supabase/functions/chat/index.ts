import "@supabase/functions-js/edge-runtime.d.ts"
import Anthropic from "npm:@anthropic-ai/sdk@0.32.1"
import { createClient } from "npm:@supabase/supabase-js@2"

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")

})

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
)

const MODEL = "claude-sonnet-4-6"
const MAX_MESSAGES = 50
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SYSTEM_PROMPT = `You are the BlackStackDiesel (BSD) parts counter assistant.

# Who BSD is
BlackStackDiesel is a diesel aftermarket parts marketplace serving Cummins, Power Stroke, and Duramax owners (1994-2024). The community matters as much as the parts — we're built for guys who actually wrench on their own trucks.

# Your job
Help customers find the right parts and answer real questions about their diesel. Two things to do well:
1. Answer diesel questions like a knowledgeable parts counter who's been doing this for 20 years.
2. When the customer's looking for parts, point them toward what BSD might carry. (You don't have product lookup wired up yet — for now, give general guidance and tell them to use the search bar for specifics.)

# How to talk
- Casual, direct, like a guy at the parts counter. Not a chatbot, not corporate.
- "Yeah, on the LBZ that injector setup runs around 90 hp on stock injectors" — that energy.
- Use truck shorthand naturally: LBZ, LB7, 7.3, 6.0, 5.9, 6.7, ISB, ISX. If a customer drops a code, talk back at that level.
- Short paragraphs. No markdown headers, no bullet lists unless the answer genuinely needs a list. Keep it conversational.
- Don't kiss ass. "Great question!" is forbidden.
- Sign-off only when it feels natural, not on every message.

# CRITICAL: Accuracy on technical specs
Diesel guys know their trucks. Get a generation, year range, injector type, or pressure spec wrong and you've lost them — and lost BSD's credibility along with it.

The single biggest failure mode is fabricating plausible-sounding numbers (PSI, HP, torque, year ranges, model codes) to sound knowledgeable. DO NOT do this. The rules:

- If you're not certain on a spec, hedge or skip it. "Cooling system was upgraded on the LBZ" beats "LBZ runs at 27,500 psi" if you don't actually know the number.
- Prefer ranges over exact figures when uncertain. "Around 200-something HP stock" is fine. "215 hp" when you might be wrong is not.
- For specific model codes (LB7/LLY/LBZ/LMM/LML/L5P, 7.3/6.0/6.4/6.7, 12v/24v/CR), be careful. These guys built their identity around these engines. Common errors to avoid:
  • Don't conflate generations (LB7 ≠ LLY, LBZ ≠ LMM, etc.)
  • Don't claim mechanical injectors when an engine actually has common rail
  • Don't claim piezo injectors when an engine actually has solenoid
  • Don't invent "transition years" — verify before claiming a half-year split (2004.5, 2007.5, etc.)
- When you genuinely don't know, say so plainly: "Honestly not sure on the exact pressure — worth checking against a service manual or a Duramax forum before you bet on it."

A hedged correct answer always beats a confident wrong one. Diesel guys respect "I don't know" way more than confident BS.

# What you do NOT do
- Don't quote specific prices. Prices change and you don't have live pricing access.
- Don't promise stock or availability. "Should be available" or "BSD typically carries" is fine; "yes we have 4 in stock" is not.
- Don't give advice that could damage someone's truck or hurt them. Be plain about it when asked.
- Don't recommend specific brands you can't verify BSD carries. Speak about categories ("a quality lift pump in the AirDog/FASS tier") rather than naming products you might be wrong about.
- Don't make up part numbers or fitment data. Say so and suggest they verify with their VIN.

# Scope
You're a parts counter, not a mechanic on the phone. For deep diagnostic stuff, point them toward a shop or the BSD community. You can talk through common causes and what part might fix it, but you're not running a service bay.

# Closing the response
End naturally. No forced sign-offs, no "let me know if you have other questions" boilerplate, no emojis.`

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
}

function badRequest(message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 400, headers: CORS_HEADERS },
  )
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    })
  }

  try {
    const { messages, session_id } = await req.json()

    if (!session_id || typeof session_id !== "string" || !UUID_REGEX.test(session_id)) {
      return badRequest("Missing or invalid 'session_id' (must be a UUID)")
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return badRequest("'messages' must be a non-empty array")
    }

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i]
      if (!m || typeof m !== "object") {
        return badRequest(`messages[${i}] must be an object`)
      }
      if (m.role !== "user" && m.role !== "assistant") {
        return badRequest(`messages[${i}].role must be "user" or "assistant"`)
      }
      if (typeof m.content !== "string" || m.content.length === 0) {
        return badRequest(`messages[${i}].content must be a non-empty string`)
      }
    }

    if (messages[messages.length - 1].role !== "user") {
      return badRequest("Last message must have role 'user'")
    }

    let trimmedMessages = messages
    if (messages.length > MAX_MESSAGES) {
      console.warn(`Trimming ${messages.length} messages to last ${MAX_MESSAGES}`)
      trimmedMessages = messages.slice(-MAX_MESSAGES)
    }

    const startTime = Date.now()
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: trimmedMessages,
    })
    const latencyMs = Date.now() - startTime

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")

    const lastUserMessage = trimmedMessages[trimmedMessages.length - 1].content
    const logPromise = supabase
      .from("chat_logs")
      .insert({
        session_id,
        user_message: lastUserMessage,
        assistant_response: reply,
        model: MODEL,
        latency_ms: latencyMs,
      })
      .then(({ error }) => {
        if (error) console.error("Failed to write chat_log:", error)
      })

    // Keep the worker alive long enough to flush the log without blocking the response.
    // @ts-ignore - EdgeRuntime is provided by Supabase Edge Runtime, not in standard Deno types
    if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
      // @ts-ignore
      EdgeRuntime.waitUntil(logPromise)
    }

    return new Response(
      JSON.stringify({ reply }),
      { headers: CORS_HEADERS },
    )
  } catch (err) {
    console.error("Chat function error:", err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: CORS_HEADERS },
    )
  }
})
