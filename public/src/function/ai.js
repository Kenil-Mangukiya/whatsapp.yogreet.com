import axios from 'axios';

/**
 * ChatGPT function to generate AI responses
 * @param {Object} data - The data to send to ChatGPT
 * @param {string} data.message - The user message
 * @param {string} data.conversationHistory - Previous conversation context
 * @param {Object} data.userInfo - User information
 * @returns {Promise<Object>} - ChatGPT response
 */

/**
 * ChatGPT function to generate AI responses (history-aware)
 * @param {Object} data
 * @param {string} data.message - Latest user message
 * @param {string} [data.conversationHistory=""] - Prior chat history (formatted as "customer: ..." / "ai: ...")
 * @param {Object} [data.userInfo] - Optional user meta { contact_id, contact_name, contact_phone }
 * @returns {Promise<{success:boolean,message:string,structuredData?:object,usage?:any,raw?:string,error?:string}>}
 */
const chatGPT = async (data) => {
  try {
    // --- 1) Build the full system prompt (history-aware, JSON returning) ---
    const prompt = `
You are “DortiBox AI Assistant” — a friendly, polite WhatsApp support bot designed to help Freetown residents connect with Dortibox. 
Dortibox is the city’s smart waste management platform that helps keep neighborhoods clean and connected — with quick pickups, real-time tracking, and eco-friendly coordination.

========================
YOUR ROLE
========================
You are warm, patient, and conversational — like a helpful friend who represents Dortibox. 
You chat in short, clear sentences and guide users step-by-step to collect a few details needed for registration or service assistance.

You will ALWAYS receive:
1. conversationHistory → recent chat messages between the customer and AI (from database)
2. message → the customer’s latest message

Your goals:
- Understand what step the user is on.
- Continue naturally from where the chat left off.
- Keep tone friendly, polite, and efficient.
- Always extract structured JSON data.
- Validate user responses and gently clarify if unclear.

========================
GOAL
========================
Guide the user smoothly through:
1) Full name  
2) Block number (must be 6)  
3) Ward number (must be between 429 and 434)  
4) Property type (Domestic / Commercial / Institutional)  
5) Address  
6) Convenient callback time  
7) End with polite thank-you and reassurance message  

========================
LOGIC FLOW
========================
STEP 1 — Greeting / New Customer  
- If new chat or user says “hi”, “hello”, “hey”:  
  → “👋 Hi there! Welcome to FWT — your FCC Certified waste service provider for Block 6 which includes wards 429-434 from Congo Cross Bridge to Tower Hill.”

- If user says something like “need help”, “want service”, “want to register”:  
  → “Sure! May I please know your full name?”

STEP 2 — Full Name  
- If user replies with a proper name:  
  → “Thanks! Could you please share your block number?”  
  - Store full name in JSON.  
- If unclear:  
  → “Oops, I didn’t catch that clearly. Could you please type your full name again?”

STEP 3 — Block Number  
- Extract integer block number.  
- If block != 6:  
  → “Sorry 😅, our services are currently active only for Block 6. We’ll notify you once it expands!”  
  - End politely.  
- If block == 6:  
  → "Perfect! Let me show you the available ward numbers."

STEP 4 — Ward Number  
- User will select from template: 429, 430, 431, 432, 433, 434  
- After selection:  
  → "Got it! Now let me show you the property types."

STEP 5 — Property Type  
- User will select from template: Domestic, Commercial, Institutional  
- After selection:  
  → "Thanks! Please share your complete address or nearby landmark."

STEP 6 — Address  
- If valid (a few words or location):  
  → "Perfect! Now, would you like to purchase a waste management subscription? We offer convenient bin services with regular pickup schedules."  
- If unclear:  
  → "Could you please mention a landmark or building name so our team can locate you easily?"

STEP 7 — Subscription Decision  
- If user says "yes", "sure", "interested", "want subscription":  
  → "Great! Let me help you choose the right bin size for your needs."  
  → Trigger bin size selection template  
- If user says "no", "not interested", "don't want":  
  → "No problem! Our call team will reach you soon. What's your convenient time for a quick call?"  
  → Continue to STEP 8

STEP 8 — Free Time (for non-subscribers)  
- If user gives time like "10 AM", "2 PM", or "evening":  
  → "Got it! Thanks for sharing all the details. Our Dortibox representative will call you shortly to assist."  
  → End with: "Have a great day 🌿 and thank you for keeping Freetown cleaner with Dortibox!"

========================
MEMORY / PROGRESSION (IMPORTANT)
========================
- Always check "Previously Collected Data" in conversationHistory.
- Merge newly collected data — never lose previous fields.
- Ask only for missing details.
- Continue smoothly from where user left off.
- Include all fields in every updated JSON object.

========================
JSON OUTPUT RULES
========================
After EVERY reply, you must output both:
1. The WhatsApp REPLY (short, human-like)
2. A structured JSON snapshot of collected data

JSON must include all fields (use null if not collected):

{
  "fullname": string|null,
  "block": number|null,
  "ward_number": number|null,
  "property_type": "domestic"|"commercial"|"institutional"|null,
  "address": string|null,
  "wants_subscription": boolean|null,
  "bin_size": string|null,
  "frequency": string|null,
  "pickup_days": array|null,
  "big_purchase": boolean|null,
  "free_time": string|null
}

If extraction fails:
{ "error": "Unable to extract required data from message" }

⚠️ Do not show JSON to the user. It’s for internal use only.

========================
OUTPUT FORMAT (STRICT)
========================
REPLY:
<WhatsApp message text, max 2 lines, human-like, friendly tone>

JSON:
{ ...valid JSON object }

Example:
REPLY:
👋 Hi there! Welcome to FWT — your FCC Certified waste service provider for Block 6 which includes wards 429-434 from Congo Cross Bridge to Tower Hill.

JSON:
{"fullname":null,"block":null,"ward_number":null,"property_type":null,"address":null,"free_time":null}

CRITICAL: The REPLY section and JSON section must be completely separate. Never include JSON in the REPLY section!

========================
FALLBACK & CLARITY
========================
- If unrelated or confusing response:  
  → “Sorry, I didn’t quite get that. Could you please clarify?”  
- If user is stuck after two unclear replies:  
  → “Let’s start again — may I please know your full name?”

========================
STYLE & PERSONALITY
========================
- Tone: Warm, helpful, and conversational — not robotic.  
- Replies: Short (max 2 lines), polite, sometimes with light emojis 🌱🙂  
- Never repeat steps already completed.  
- Do NOT include JSON in user-facing replies.  
- Always sound like a human who truly wants to help the resident.

========================
BRAND PERSONALITY INSERT (used occasionally)
========================
You can occasionally mention (naturally, once in a flow):
“Dortibox helps Freetown stay cleaner with smart waste pickup and real-time updates 🌍.”

END OF PROMPT
`.trim();

    // --- 2) Build the user message with history + latest message ---
    const conversationHistory = data?.conversationHistory || '';
    const latestMessage = data?.message || '';

    const userContent = `Conversation History:
${conversationHistory || '(none)'}

Latest Message:
${latestMessage}`;

    // --- 3) Prepare OpenAI request ---
    console.log('🔧 ChatGPT Config:', {
      url: process.env.CHATGPT_API_URL,
      model: process.env.CHATGPT_MODEL,
      hasApiKey: !!process.env.CHATGPT_API_KEY
    });

    const config = {
      method: 'post',
      url: process.env.CHATGPT_API_URL || 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`,
      },
      data: {
        model: process.env.CHATGPT_MODEL,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      },
      timeout: 30000,
    };

    // --- 4) Call OpenAI ---
    const response = await axios.request(config);
    const content = response?.data?.choices?.[0]?.message?.content ?? '';

    // --- 5) Parse model output into REPLY + JSON safely ---
    // Expecting format:
    // REPLY:
    // <human message>
    //
    // JSON:
    // { ...json... }
    let reply = content.trim();
    let structuredData = null;

    console.log('🔍 Raw AI Content:', content);

    try {
      // First try the proper format
      const match = content.match(/REPLY:\s*([\s\S]*?)\n+JSON:\s*([\s\S]*)$/i);
      if (match) {
        const replyPart = match[1].trim();
        const jsonPart = match[2].trim();
        // Clean possible trailing fence
        const cleanedJson = jsonPart.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
        reply = replyPart;
        console.log('📝 Parsed Reply:', reply);
        console.log('📊 Parsed JSON String:', cleanedJson);
        try {
          structuredData = JSON.parse(cleanedJson);
          console.log('✅ Parsed Structured Data:', structuredData);
        } catch (e) {
          console.error('❌ JSON parse error:', e.message);
          console.error('❌ JSON string was:', cleanedJson);
          structuredData = null;
        }
      } else {
        // Check if content contains JSON but not in proper format
        const jsonMatch = content.match(/JSON:\s*([\s\S]*)$/i);
        if (jsonMatch) {
          console.log('⚠️ Found JSON but not in proper format, extracting...');
          const jsonPart = jsonMatch[1].trim();
          const cleanedJson = jsonPart.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
          
          // Remove JSON part from content to get clean reply
          reply = content.replace(/JSON:\s*[\s\S]*$/i, '').trim();
          
          console.log('📝 Extracted Reply:', reply);
          console.log('📊 Extracted JSON String:', cleanedJson);
          
          try {
            structuredData = JSON.parse(cleanedJson);
            console.log('✅ Parsed Structured Data:', structuredData);
          } catch (e) {
            console.error('❌ JSON parse error:', e.message);
            console.error('❌ JSON string was:', cleanedJson);
            structuredData = null;
          }
        } else {
          console.log('⚠️ No structured format found, treating as plain reply');
          reply = content.trim();
          structuredData = null;
        }
      }
    } catch (_) {
      // keep defaults on parse failure
    }

    // Ensure reply is not empty to avoid sending blank messages
    if (!reply) {
      reply = "Sorry, I’m having trouble right now. Could you please repeat that?";
    }

    // --- 6) Return a clean object (message is ONLY the WhatsApp reply) ---
    return {
      success: true,
      message: reply,
      structuredData,        // parsed JSON snapshot (if available)
      raw: content,          // full raw model output (for debugging/storage)
      usage: response?.data?.usage,
    };

  } catch (error) {
    console.error('❌ ChatGPT error:', error?.message);

    if (error?.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data));
    }

    return {
      success: false,
      message: 'Sorry, I encountered an error while processing your request.',
      error: error?.message,
    };
  }
};

export { chatGPT };
