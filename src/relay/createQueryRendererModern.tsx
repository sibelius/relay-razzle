import React from 'react';
import { GraphQLTaggedNode, QueryRenderer, Variables } from 'react-relay';

import useRelayEnvironment from './useRelayEnvironment';

type Config = {
  query: GraphQLTaggedNode;
  queriesParams?: ((props: object) => object) | undefined;
  variables?: Variables;
  loadingView?: React.ReactNode;
  fetchPolicy?: string;
  getFragmentProps?: (fragmentProps: object) => object;
};

export default function createQueryRendererModern(
  FragmentComponent: React.ComponentType,
  config: Config,
): React.ComponentType {
  const { query, queriesParams } = config;

  const QueryRendererWrapper = wrapperProps => {
    const environment = useRelayEnvironment();

    const variables = queriesParams ? queriesParams(wrapperProps) : config.variables;

    return (
      <QueryRenderer
        environment={environment}
        query={query}
        variables={variables}
        fetchPolicy={config.fetchPolicy || 'store-or-network'}
        render={({ error, props, retry }) => {
          if (props) {
            const fragmentProps = config.getFragmentProps ? config.getFragmentProps(props) : { query: props };

            return <FragmentComponent {...wrapperProps} {...fragmentProps} />;
          }

          if (error) {
            return <span>{error.toString()}</span>;
          }

          return <span>Logading</span>
        }}
      />
    );
  };

  return QueryRendererWrapper;
}
