import { HttpStatusCode } from 'axios';
import { CustomAxiosError } from '../types/error';
import { createResponse, groupSettledPromises, parsePath, sleep } from './utils';

describe('Test utils', () => {
  it('sleep()', async () => {
    await sleep(1);
  });
  it('createResponse()', async () => {
    const result = await createResponse();
    expect(result).toEqual({
      body: '',
      headers: {
        ['Access-Control-Allow-Origin']: '*',
        ['Content-Type']: 'application/json',
      },
      statusCode: 200,
    });
    const result2 = await createResponse(HttpStatusCode.BadRequest, { a: 5 });
    expect(result2).toEqual({
      body: '{"a":5}',
      headers: {
        ['Access-Control-Allow-Origin']: '*',
        ['Content-Type']: 'application/json',
      },
      statusCode: 400,
    });
  });
  it('groupSettledPromises()', async () => {
    const func = async (input: any) => {  // eslint-disable-line
      return input.toString();
    };
    const promises = [];
    promises.push(func(5));
    promises.push(func(undefined));
    promises.push(func('7'));
    promises.push(sleep(1));
    const responses = await Promise.allSettled(promises);
    const result = groupSettledPromises(responses);
    const { errors } = result;
    expect(errors.length).toEqual(1);
    expect(errors[0].message).toEqual("Cannot read properties of undefined (reading 'toString')");
    expect(result).toEqual({
      errors,
      successes: ['5', '7', undefined],
    });
  });
  it('parsePath()', async () => {
    expect(parsePath('')).toEqual({ pathParts: [] });
    expect(parsePath('/v1')).toEqual({ pathParts: [] });
    expect(parsePath('/v30')).toEqual({ pathParts: [] });
    expect(parsePath('/auth')).toEqual({ pathParts: ['auth'], pathFirst: 'auth' });
    expect(parsePath('/v1/auth/test', 'auth')).toEqual({ pathParts: ['auth','test'], pathFirst: 'auth' });
    expect(() => {parsePath('/v1/xyz/test', 'auth')}).toThrow(CustomAxiosError);
    expect(parsePath('/v2/customer/try/this', 'customer')).toEqual({ pathParts: ['customer','try','this'], pathFirst: 'customer' });
    
  });
});
