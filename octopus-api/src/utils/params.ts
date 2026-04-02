/**
 * Safely extract a route parameter as a string.
 * Express 5 types params as string | string[] | undefined.
 */
export function getParam(params: Record<string, string | string[] | undefined>, key: string): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0];
  return value || '';
}
