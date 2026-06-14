import { generateSystemPrompt } from './chatbotContext';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL_NAME = 'llama-3.1-8b-instant'; // Modèle mis à jour et supporté

export const sendChatMessage = async (messages, products = [], voiceMode = false) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("Clé API Groq manquante. Veuillez vérifier votre configuration.");
  }

  // Préparer le tableau de messages avec le prompt système généré dynamiquement
  const systemPrompt = generateSystemPrompt(products, voiceMode);
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }))
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: formattedMessages,
        temperature: 0.5,
        max_tokens: 512
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erreur API Groq:", errorData);
      throw new Error(errorData.error?.message || 'Erreur lors de la communication avec le serveur.');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Erreur dans sendChatMessage:", error);
    throw error;
  }
};
