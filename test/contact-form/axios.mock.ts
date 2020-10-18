const data = { msg: 'success' };
module.exports = {
    get: jest.fn(_url => Promise.resolve({
        data
    })),

    post: jest.fn(_url => Promise.resolve({
        data
    })),
    create: jest.fn(function () {
        return this;
    })
};
