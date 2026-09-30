export const searchHorizon = async (apiKey: string, query: string): Promise<any> => {
    const key = apiKey || (import.meta as any).env.VITE_RAPIDAPI_KEY;
    if (!key) {
        throw new Error("RapidAPI Key is required.");
    }

    // Using the provided BreachDirectory API structure
    const targetUrl = `https://breachdirectory.p.rapidapi.com/?func=auto&term=${encodeURIComponent(query)}`;
    
    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-key': key,
                'x-rapidapi-host': 'breachdirectory.p.rapidapi.com'
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error("BreachDirectory: Invalid RapidAPI Key or unauthorized.");
            }
            throw new Error(`BreachDirectory API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("BreachDirectory API Error:", error);
        throw error;
    }
};
