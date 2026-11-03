import { app } from '@azure/functions';
import { createHandler } from './handler.js';
app.http('contact-form', {methods:['GET','POST'],authLevel:'anonymous',route:'contact-form',handler:createHandler()});
