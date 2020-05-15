import { CacheConfig, UploadableMap, Variables } from 'react-relay';
import { RequestNode } from 'relay-runtime';

export const isMutation = (request: RequestNode) => request.operationKind === 'mutation';
// export const isQuery = (request: RequestNode) => request.operationKind === 'query';
export const forceFetch = (cacheConfig: CacheConfig) => !!(cacheConfig && cacheConfig.force);

export const handleData = (response: any) => {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.indexOf('application/json') !== -1) {
    return response.json();
  }

  return response.text();
};

function getRequestBodyWithUploadables(request, variables, uploadables) {
  const formData = new FormData();
  // $FlowFixMe
  formData.append('query', request.text);
  formData.append('variables', JSON.stringify(variables));

  if (Array.isArray(uploadables)) {
    uploadables.forEach((uploadable, key) => {
      // $FlowFixMe
      formData.append(`image${key}`, {
        name: uploadable.filename || `image${key}.jpg`,
        type: uploadable.mime || 'image/jpg',
        uri: uploadable.path,
      });
    });
  }

  return formData;
}

function getRequestBodyWithoutUplodables(request, variables) {
  return JSON.stringify({
    query: request.text, // GraphQL text from input
    variables,
  });
}

export function getRequestBody(request: RequestNode, variables: Variables, uploadables: UploadableMap) {
  if (uploadables) {
    return getRequestBodyWithUploadables({
      request,
      variables,
      uploadables,
    });
  }

  return getRequestBodyWithoutUplodables(request, variables);
}

export const getHeaders = (uploadables: UploadableMap) => {
  if (uploadables) {
    return {
      Accept: '*/*',
    };
  }

  return {
    Accept: 'application/json',
    'Content-type': 'application/json',
  };
};
