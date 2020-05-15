import {
  Environment,
  Network,
  RecordSource,
  Store,
} from 'relay-runtime';

import cacheHandler from './cacheHandler';

const network = Network.create(cacheHandler);

const source = new RecordSource();
const store = new Store(source, {
  // This property tells Relay to not immediately clear its cache when the user
  // navigates around the app. Relay will hold onto the specified number of
  // query results, allowing the user to return to recently visited pages
  // and reusing cached data if its available/fresh.
  gcReleaseBufferSize: 10,
});

const env = new Environment({
  network,
  store,
});

export default env;

let relayEnvironment = null;

export const initEnvironment = (records = {}) => {
  const network = Network.create(cacheHandler);

  const source = new RecordSource(records);
  const store = new Store(source, {
    // This property tells Relay to not immediately clear its cache when the user
    // navigates around the app. Relay will hold onto the specified number of
    // query results, allowing the user to return to recently visited pages
    // and reusing cached data if its available/fresh.
    gcReleaseBufferSize: 10,
  });

  // Make sure to create a new Relay environment for every server-side request so that data
  // isn't shared between connections (which would be bad)
  if (typeof window === 'undefined') {
    return new Environment({
      configName: 'server',
      network,
      store,
    });
  }

  // reuse Relay environment on client-side
  if (!relayEnvironment) {
    relayEnvironment = new Environment({
      configName: 'client',
      network,
      store,
    });
  }

  return relayEnvironment;
};
