/** An error whose message is meant for the person, with the HTTP status to answer with. */
export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'error', public extra?: Record<string, unknown>) { super(message); }
}
export const bad = (m: string, extra?: Record<string, unknown>) => new HttpError(400, m, 'bad_request', extra);
export const unauthorized = (m = 'Sign in first') => new HttpError(401, m, 'unauthorized');
export const forbidden = (m = 'You do not have access to this') => new HttpError(403, m, 'forbidden');
export const notFound = (m = 'Not found') => new HttpError(404, m, 'not_found');
export const conflict = (m: string, extra?: Record<string, unknown>) => new HttpError(409, m, 'conflict', extra);
