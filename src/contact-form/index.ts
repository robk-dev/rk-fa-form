import { AzureFunction, Context, HttpRequest } from "@azure/functions";

const axios = require('axios');
const https = require('https');

const instance = axios.create({
    httpsAgent: new https.Agent({ keepAlive: true }) // keepAlive & pool for reusing tcp connection/sockets
});

import * as Joi from 'joi';

const _validationOptions = {
    abortEarly: true, // abort after the first validation error
    allowUnknown: false // allow unknown keys that will be ignored
};

const form = Joi.object().keys({
    name: Joi.string()
        .trim()
        .regex(/^[a-zA-Z]+$/)
        .required()
        .error(new Error('Invalid first name.')),
    _replyto: Joi.string()
        .trim()
        .email()
        .max(100)
        .required()
        .error(new Error('Invalid email.')),
    phone_number: Joi.string()
        .trim()
        .alphanum()
        .error(new Error('Invalid phone_number.')),
    message: Joi.string().max(100)
        .error(new Error('Message too long email.'))
});

export const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const { body = '' } = req;
    if (!body || typeof body !== 'string' || body.length < 5) {
        return context.res.status(400).send();
    }

    let data = {};
    const pairs = decodeURIComponent(body).split('&') || [];
    pairs.forEach(str => {
        const [key, value] = str.split('=');
        data[key] = value;
    });

    const { value: validated, error } = form.validate(data, _validationOptions);

    if (error) {
        return context.res.status(400).send();
    }

    try {
        await instance.post(process.env.DB_URL, validated);
        return context.res.status(302)
            .set('location', process.env.REDIRECT_URL)
            .send();
    } catch (error) {
        context.log.error({ msg: 'error connecting to DB', error });
        return context.res.status(500).send();
    }
};
