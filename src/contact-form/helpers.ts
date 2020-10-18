import * as Joi from 'joi';

const axios = require('axios');
const https = require('https');

export const instance = axios.create({
    httpsAgent: new https.Agent({ keepAlive: true }) // keepAlive & pool for reusing tcp connection/sockets
});

export const form = Joi.object().keys({
    name: Joi.string()
        .trim()
        .regex(/^[a-zA-Z][a-zA-Z\s]*$/)
        .max(100)
        .required()
        .error(new Error('Invalid first name.')),
    email: Joi.string()
        .trim()
        .email()
        .max(100)
        .required()
        .error(new Error('Invalid email.')),
    phone: Joi.string()
        .trim()
        .min(5)
        .max(20)
        .error(new Error('Invalid phone number.')),
    message: Joi.string().max(100)
        .error(new Error('Message too long.'))
});
