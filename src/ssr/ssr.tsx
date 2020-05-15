import { matchRoutes, MatchedRoute, RouteConfig } from 'react-router-config';
import { fetchQuery } from 'react-relay';

/**
 * Match the current location to the corresponding route entry.
 */
const matchRoute = (routes: RouteConfig[], location: Location) => {
  const matchedRoutes = matchRoutes(routes, location.pathname);
  if (!Array.isArray(matchedRoutes) || matchedRoutes.length === 0) {
    throw new Error('No route for ' + location.pathname);
  }
  return matchedRoutes;
};

/**
 * Load the data for the matched route, given the params extracted from the route
 */
const prepareMatches = <Params extends { [K in keyof Params]?: string }>(matches: Array<MatchedRoute<Params>>) => {
  return matches.map(match => {
    const { route, match: matchData } = match;
    const prepared = route.prepare ? route.prepare(matchData.params) : {};
    // const Component = route.component.get();
    // if (Component == null) {
    //   route.component.load(); // eagerly load
    // }
    return { component: route.component, prepared, routeData: matchData };
  });
};

export const getQueryName = query => {
  return query.default.fragment.name;
};

export const fetchMatchesQueries = async <Params extends { [K in keyof Params]?: string }>(
  environment,
  matches: Array<MatchedRoute<Params>>,
) => {
  return await Promise.all(
    matches.map(async match => {
      if (match.route.query) {
        const variables = match.route.queriesParams ? match.route.queriesParams({ match: match.match }) : {};

        await fetchQuery(environment, match.route.query, variables);

        // eslint-disable-next-line
        console.log('match query: ', getQueryName(match.route.query));
      }
    }),
  );
};

export const getInitialEntries = (routes: RouteConfig, history: History) => {
  const initialMatches = matchRoute(routes, history.location);

  return initialMatches;

  const initialEntries = prepareMatches(initialMatches);

  const currentEntry = {
    location: history.location,
    entries: initialEntries,
  };

  return currentEntry;
};
