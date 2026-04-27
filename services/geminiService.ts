
export const getEncouragement = async (score: number, total: number): Promise<string> => {
  try {
    const response = await fetch('/api/encouragement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ score, total }),
    });

    if (!response.ok) {
      throw new Error(`Encouragement API returned ${response.status}`);
    }

    const payload = await response.json() as { message?: unknown };
    return typeof payload.message === 'string' && payload.message.trim()
      ? payload.message
      : "Wow! You are a superstar! Keep playing! 🌟";
  } catch (error) {
    console.error("Gemini error:", error);
    return "Amazing job, little explorer! You're getting so smart! 🚀";
  }
};
