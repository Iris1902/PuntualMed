const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export const sendSymptomToAI = async (symptomId: string, token: string) => {
  try {
    const response = await fetch(`${BASE_URL}/api/ai/symptoms/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Tu backend pide usuario autenticado; le pasamos el token Bearer
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        symptom_id: symptomId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Error en la respuesta del servidor");
    }

    const data = await response.json();
    // Retornamos el objeto con el formato de AiMessageRead que devuelve tu backend
    return data; 
  } catch (error) {
    console.error("Error al conectar con la IA:", error);
    throw error;
  }
};