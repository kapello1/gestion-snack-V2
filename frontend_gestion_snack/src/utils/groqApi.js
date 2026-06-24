import { generateSystemPrompt } from './chatbotContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const sendChatMessage = async (messages, products = [], voiceMode = false) => {
  const systemPrompt = generateSystemPrompt(products, voiceMode);
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }))
  ];
  try {
    const response = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: formattedMessages, voiceMode })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur de communication avec le serveur.');
    }
    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error("Erreur sendChatMessage:", error);
    throw error;
  }
};

// Assistant avec function calling (réservation réelle). customerId = user.ownerId
export const sendAssistantMessage = async (messages, customerId = null) => {
  const formattedMessages = messages.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.text
  }));
  try {
    const response = await fetch(`${API_BASE}/ai/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: formattedMessages, customerId })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur de communication avec le serveur.');
    }
    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error("Erreur sendAssistantMessage:", error);
    throw error;
  }
};
