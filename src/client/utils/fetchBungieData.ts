export const fetchBungieData = async (path: string, method: 'GET' | 'POST', body?: object) => {
    const url = `${process.env.BUNGIE_API_PATH}${path}`;
    const headers = {
      'X-API-Key': process.env.BUNGIE_API_KEY!,
      'Content-Type': 'application/json',
    };
  
    const options: RequestInit = {
      method,
      headers,
    };
  
    if (body) {
      options.body = JSON.stringify(body);
    }
  
    const response = await fetch(url, options);
  
    if (!response.ok) {
      const errorDetails = await response.json();
      console.error('Bungie API Error:', errorDetails);
      throw new Error(`Bungie API Error: ${response.statusText}`);
    }
  
    return response.json();
  };