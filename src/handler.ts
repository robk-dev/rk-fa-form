import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export interface Contact { name: string; email: string; phone: string; message: string }
export type SaveContact = (contact: Contact) => Promise<void>;

export { saveContact } from './storage.js';
import { saveContact } from './storage.js';

function errorResponse(status: number, message: string): HttpResponseInit {
  return {status, headers: {'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store'},
    body:`<!doctype html><html lang="en"><meta charset="utf-8"><title>Contact form</title><h1>Message not sent</h1><p>${message}</p><p><a href="https://www.robk.dev/#contact">Return to the contact form</a></p></html>`};
}

export function createHandler(save: SaveContact = saveContact) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (request.method !== 'POST') return {...errorResponse(405, 'Please submit the form on the website.'), headers:{'Allow':'POST','Content-Type':'text/html; charset=utf-8'}};
    if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/x-www-form-urlencoded')) return errorResponse(415, 'Unsupported form format.');
    const body = await request.text();
    if (body.length > 8192) return errorResponse(413, 'The submitted form is too large.');
    const form = new URLSearchParams(body);
    const keys = ['name','email','phone','message'];
    if ([...form.keys()].some(k => !keys.includes(k)) || keys.some(k => form.getAll(k).length > 1)) return errorResponse(400, 'The submitted form contains unexpected fields.');
    const contact = Object.fromEntries(keys.map(k => [k,(form.get(k) || '').trim()])) as unknown as Contact;
    if (!contact.name || contact.name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) || contact.email.length > 100 || contact.phone.length > 20 || contact.message.length > 100) return errorResponse(400, 'Please provide a name and valid email, and keep the message within 100 characters.');
    try {
      await save(contact);
      return {status:303, headers:{Location:process.env.REDIRECT_URL || 'https://www.robk.dev/?contact=sent#contact', 'Cache-Control':'no-store'}};
    } catch {
      context.error('Contact submission could not be persisted.');
      return errorResponse(503, 'We could not save your message. Please try again later.');
    }
  };
}
