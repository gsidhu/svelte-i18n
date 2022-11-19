import { get } from 'svelte/store';

import { lookup } from '../../../src/runtime/includes/lookup';
import {
  getPossibleLocales,
  getCurrentLocale,
  $locale,
} from '../../../src/runtime/stores/locale';
import { getOptions, init } from '../../../src/runtime/configs';
import { register, isLoading } from '../../../src/runtime';
import { hasLocaleQueue } from '../../../src/runtime/includes/loaderQueue';
import { $dictionary } from '../../../src/runtime/stores/dictionary';

beforeEach(() => {
  init({ fallbackLocale: undefined as any });
  $locale.set(undefined);
  $dictionary.set({});
});

test('sets and gets the fallback locale', () => {
  init({ fallbackLocale: 'en' });
  expect(getOptions().fallbackLocale).toBe('en');
});

test('gets the current locale', () => {
  expect(getCurrentLocale()).toBeUndefined();
  $locale.set('es-ES');
  expect(getCurrentLocale()).toBe('es-ES');
});

test('if no initial locale is set, set the locale to the fallback', () => {
  init({ fallbackLocale: 'pt' });
  expect(get($locale)).toBe('pt');
  expect(getOptions().fallbackLocale).toBe('pt');
});

test('if no initial locale was found, set to the fallback locale', () => {
  init({
    fallbackLocale: 'en',
  });
  expect(get($locale)).toBe('en');
  expect(getOptions().fallbackLocale).toBe('en');
});

test('should flush the queue of the locale when changing the store value', async () => {
  register(
    'en',
    () => new Promise((res) => setTimeout(() => res({ foo: 'Foo' }), 50)),
  );

  expect(hasLocaleQueue('en')).toBe(true);

  await $locale.set('en');

  expect(hasLocaleQueue('en')).toBe(false);
  expect(lookup('foo', 'en')).toBe('Foo');
});

test('if no locale is set, ignore the loading delay', async () => {
  register(
    'en',
    () => new Promise((res) => setTimeout(() => res({ foo: 'Foo' }), 50)),
  );

  const promise = $locale.set('en');

  expect(get(isLoading)).toBe(true);

  await promise;

  expect(get(isLoading)).toBe(false);
});

test("if a locale is set, don't ignore the loading delay", async () => {
  register(
    'en',
    () => new Promise((res) => setTimeout(() => res({ foo: 'Foo' }), 50)),
  );
  register(
    'pt',
    () => new Promise((res) => setTimeout(() => res({ foo: 'Foo' }), 50)),
  );

  await $locale.set('en');
  const promise = $locale.set('pt');

  expect(get(isLoading)).toBe(false);

  await promise;

  expect(get(isLoading)).toBe(false);
});

describe('array input', () => {
  it('sets the locale to the first available locale in the array', async () => {
    init({ fallbackLocale: 'en' });

    register('en', () => Promise.resolve({ foo: 'Foo' }));
    register('de', () => Promise.resolve({ foo: 'Foo' }));
    register('es', () => Promise.resolve({ foo: 'Foo' }));

    expect(get($locale)).toBe('en');

    await $locale.set(['it', 'es']);

    expect(get($locale)).toBe('es');
  });

  it('sets the locale to the first closest available locale in the array', async () => {
    init({ fallbackLocale: 'en' });

    register('en', () => Promise.resolve({ foo: 'Foo' }));
    register('es', () => Promise.resolve({ foo: 'Foo' }));

    expect(get($locale)).toBe('en');

    await $locale.set(['it', 'es-AR']);

    expect(get($locale)).toBe('es');
  });

  it('sets the locale to undefined if no locale passed is available', async () => {
    init({ fallbackLocale: 'en' });

    expect(get($locale)).toBe('en');

    await $locale.set(['it', 'es']);

    expect(get($locale)).toBeUndefined();
  });
});

describe('getPossibleLocales', () => {
  it('gets all possible locales from a reference locale', () => {
    expect(getPossibleLocales('en-US')).toEqual(['en-US', 'en']);
    expect(getPossibleLocales('az-Cyrl-AZ')).toEqual([
      'az-Cyrl-AZ',
      'az-Cyrl',
      'az',
    ]);
  });

  it('gets all possible locales from a list of reference locales', () => {
    expect(getPossibleLocales(['en-US', 'es-AR'])).toEqual([
      'en-US',
      'en',
      'es-AR',
      'es',
    ]);
  });

  it('gets all fallback locales of a locale including the global fallback locale', () => {
    init({ fallbackLocale: 'pt' });
    expect(getPossibleLocales('en-US')).toEqual(['en-US', 'en', 'pt']);
    expect(getPossibleLocales('az-Cyrl-AZ')).toEqual([
      'az-Cyrl-AZ',
      'az-Cyrl',
      'az',
      'pt',
    ]);
  });

  it('remove duplicate fallback locales', () => {
    expect(getPossibleLocales('en-AU', 'en-GB')).toEqual([
      'en-AU',
      'en',
      'en-GB',
    ]);
  });

  it('gets all fallback locales of a locale including the global fallback locale and its fallbacks', () => {
    expect(getPossibleLocales('en-US', 'pt-BR')).toEqual([
      'en-US',
      'en',
      'pt-BR',
      'pt',
    ]);
    expect(getPossibleLocales('en-US', 'pt-BR')).toEqual([
      'en-US',
      'en',
      'pt-BR',
      'pt',
    ]);
    expect(getPossibleLocales('az-Cyrl-AZ', 'pt-BR')).toEqual([
      'az-Cyrl-AZ',
      'az-Cyrl',
      'az',
      'pt-BR',
      'pt',
    ]);
  });

  it("don't list fallback locale twice", () => {
    expect(getPossibleLocales('pt-BR', 'pt-BR')).toEqual(['pt-BR', 'pt']);
    expect(getPossibleLocales('pt', 'pt-BR')).toEqual(['pt', 'pt-BR']);
  });
});
