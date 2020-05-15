import fetchWithRetries from 'fbjs/lib/fetchWithRetries';

import * as Sentry from '@sentry/browser';
import { CacheConfig, UploadableMap, Variables } from 'react-relay';
import { ConcreteOperation } from 'relay-runtime';

import { getDomainName, getToken } from '../security/authentication';

import { config } from '../config';

import { getHeaders, getRequestBody, handleData, isMutation } from './helpers';

const fetchQuery = async (
  operation: ConcreteOperation,
  variables: Variables,
  cacheConfig: CacheConfig,
  uploadables: UploadableMap,
) => {
  const options = {
    headers: {
      Authorization: getToken(),
      domainname: getDomainName(),
      // appversion,
      // appbuild,
      // appplatform,
      query: operation.name,
    },
    fetchTimeout: 30000,
    retryDelays: [1000, 3000, 5000, 10000],
  };

  const isMutationOperation = isMutation(operation);

  const fetchFn = isMutationOperation ? fetch : fetchWithRetries;

  try {
    const response = await fetchFn(config.GRAPHQL_URL, {
      method: 'POST',
      headers: {
        ...getHeaders(uploadables),
        ...options.headers,
      },
      body: getRequestBody(operation, variables, uploadables),
      // TODO - send cookies to server
      // credentials: 'include',
    });

    const data = await handleData(response);

    if (response.status === 403) {
      // TODO
      // if (data === 'This Access Token is expired') {
      //   logout();
      //
      //   storeRedux.dispatch(logoutRedux()); // clear redux store
      //
      //   window.location.replace(routeTo('login'));
      //
      //   throw data;
      // }
      throw data;
    }

    if (isMutationOperation && data.errors) {
      throw data;
    }

    if (!data.data) {
      Sentry.captureException(data.errors);

      throw data.errors;
    }

    return data;
  } catch (err) {
    Sentry.captureException(err);

    if (err.response && err.response.status === 401) {
      // TODO
      // logout();
      //
      // storeRedux.dispatch(logoutRedux()); // clear redux store
      //
      // window.location.replace(routeTo('login'));
      return;
    }

    const timeoutRegexp = new RegExp(/Still no successful response after/);
    const serverUnavailableRegexp = new RegExp(/Failed to fetch/);
    if (timeoutRegexp.test(err.message) || serverUnavailableRegexp.test(err.message)) {
      throw new Error('Serviço indisponível. Tente novamente mais tarde.');
    }

    throw err;
  }
};

export default fetchQuery;
