import { rawgGetGameDetails, rawgSearchGames } from './rawg';

const apiKey = process.env.RAWG_API_KEY;

const itWithKey = apiKey ? it : it.skip;

describe('RAWG API integration', () => {
  itWithKey('search e detalhes retornam dados do jogo', async () => {
    const results = await rawgSearchGames('Hollow Knight', apiKey);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    const first = results[0];
    const details = await rawgGetGameDetails(first.id, apiKey);
    expect(details.id).toBe(first.id);
    expect(typeof details.name).toBe('string');
  });
});

