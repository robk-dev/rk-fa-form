const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHandler}=require('../dist/handler.js');
const context={error:()=>{}};
const request=(body,method='POST')=>({method,headers:new Headers({'content-type':'application/x-www-form-urlencoded'}),text:async()=>body});
test('valid form is persisted before redirect; optional fields may be empty',async()=>{let saved; const r=await createHandler(async x=>{saved=x})(request('name=Jos%C3%A9+Smith&email=test%40example.com&phone=&message=Hello'),context);assert.equal(r.status,303);assert.deepEqual(saved,{name:'José Smith',email:'test@example.com',phone:'',message:'Hello'});});
test('invalid forms never persist',async()=>{for(const body of ['', 'name=A&email=invalid','name=A&name=B&email=test%40example.com','name=A&email=test%40example.com&extra=x','name=A&email=test%40example.com&message='+ 'x'.repeat(101)]){let calls=0;const r=await createHandler(async()=>{calls++})(request(body),context);assert.equal(r.status,400);assert.equal(calls,0);}});
test('storage failure is reported without redirect or sensitive details',async()=>{const r=await createHandler(async()=>{throw new Error('secret')})(request('name=A&email=test%40example.com'),context);assert.equal(r.status,503);assert.ok(!r.body.includes('secret'));assert.equal(r.headers.Location,undefined);});
test('GET never submits a message',async()=>{const r=await createHandler(async()=>assert.fail())(request('','GET'),context);assert.equal(r.status,405);});
