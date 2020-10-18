import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { form, instance } from './helpers';
const queryString = require('query-string');

export const run: AzureFunction = async function (context: Context & any, req: HttpRequest): Promise<void> {
    const { body = '' } = req;
    if (!body || typeof body !== 'string' || body.length < 5) {
        context.res = { status: 400 };
        return;
    }

    const data = queryString.parse(body);
    const { value: validated, error } = form.validate(data, _validationOptions);

    if (error) {
        context.log.error({ msg: 'Input validation failed', error });
        context.res = { status: 400 };
        return;
    }

    try {
        await instance({ method: 'post', url: process.env.DB_URL, data: validated });
        context.res = {
            status: 302,
            headers: { 'location': process.env.REDIRECT_URL }
        };
        return
    } catch (error) {
        context.log.error({ msg: 'error connecting to DB', error });
        context.res = {
            status: 500
        };
    }
};


const _validationOptions = {
    abortEarly: true, // abort after the first validation error
    allowUnknown: false // allow unknown keys that will be ignored
};
