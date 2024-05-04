import { HttpStatusCode } from 'axios';
import { createResponse, groupSettledPromises, sleep } from './utils';

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
});
