export const customFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
  });
  return response;
};
