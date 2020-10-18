import { run } from '../../src/contact-form';
const context = require('../defaultContext');

const queryString = require('query-string');

const axios = require('axios');
jest.mock('axios');

const invalid_form = {
    "name": "qwe",
    "email": "qwe",
    "phone": "qwe",
    "message": "qwe"
};

const valid_form = {
    "name": "John Doe",
    "email": "email@example.com",
    "phone": "+123456",
    "message": "message"
};

describe('Contact Form Test Suite', () => {
    beforeEach(() => {
        context.res = {};
        context.req = {};
    });


    test('/api/contact-form should return 400 on missing or invalid body', async () => {
        context.req.body = null;
        await run(context, context.req);
        expect(context.res.status).toEqual(400);
    });
    test('/api/contact-form should return 400 on missing or invalid body', async () => {
        context.req.body = 'invalid';

        await run(context, context.req);
        expect(context.res.status).toEqual(400);
    });

    test('/api/contact-form should return 400 on invalid form', async () => {
        context.req.body = queryString.stringify(invalid_form);
        await run(context, context.req);
        expect(context.res.status).toEqual(400);
    });

    // it('/api/contact-form should log error if send to DB fails should return 500', async () => {
    //     axios.get.mockImplementationOnce(() =>
    //         Promise.reject(new Error('Something went wrong.')),
    //     );

    //     context.req.body = queryString.stringify(valid_form); queryString.stringify(valid_form);

    //     await run(context, context.req);
    //     expect(context.res.status).toEqual(500);
    //     expect(context.log.mock.calls.length).toBe(1);
    // });


    // test('/api/contact-form should send http request to db on valid form', async () => {
    //     const resp = { data: 'success' };
    //     axios.get.mockResolvedValue(resp);

    //     context.req.body = queryString.stringify(valid_form);
    //     await run(context, context.req);
    //     expect(context.res.status).toEqual(302);
    //     expect(axios.mock.calls.length).toBe(1);
    // });
});