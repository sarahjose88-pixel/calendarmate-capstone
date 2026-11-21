// CalendarMate – Build Router Input (n8n Code node, "Run Once for All Items")
// Gives the router the previous assistant reply, so short confirmations
// ("yes, send it", "book the second one") are routed to the agent that asked.
const loaded = $input.first().json || {};
const history = Array.isArray(loaded.messages) ? loaded.messages : [];
const last = history.length ? history[history.length - 1] : null;
let previous = last && (last.ai || last.AIMessage || last.assistant) ? String(last.ai || last.AIMessage || last.assistant) : '';
if (previous.length > 1200) previous = previous.slice(0, 1200) + ' …';

const chatInput = $('Date Resolver').first().json.chatInput;
const routerInput = previous
  ? `PREVIOUS ASSISTANT MESSAGE (context only):\n${previous}\n\nUSER MESSAGE TO CLASSIFY:\n${chatInput}`
  : `USER MESSAGE TO CLASSIFY:\n${chatInput}`;

return [{ json: { chatInput, routerInput, hasHistory: history.length > 0 } }];
