import path from 'path';

import React from 'react';
import { StaticRouter } from 'react-router-dom';
import Koa from 'koa';
import serve from 'koa-static';
import helmet from 'koa-helmet';
import Router from 'koa-router';
import logger from 'koa-logger';
import serialize from 'serialize-javascript';
import { renderToString } from 'react-dom/server';
import { fetchQuery } from 'react-relay';
import { ServerStyleSheet } from 'styled-components';
// eslint-disable-next-line
import { ServerStyleSheets as MuiServerStyleSheets } from '@material-ui/styles';
import { parsePath } from 'history';
import proxy from 'koa-better-http-proxy';

import { RelayEnvironmentProvider } from 'react-relay/hooks';
import { ChunkExtractor, ChunkExtractorManager } from '@loadable/server';

import App from './App';
import { fetchMatchesQueries, getInitialEntries, getQueryName } from './ssr/ssr';
import { getMockHistory } from './ssr/getMockHistory';
import { initEnvironment } from './relay';
import { SESSION_COOKIE } from './security/consts';
import { config } from './config';

// TODO - get routes
// TODO - Providers

const assets = require(process.env.RAZZLE_ASSETS_MANIFEST);

const cwd = process.cwd();

// eslint-disable-next-line
console.log('process.env.RAZZLE_PUBLIC_DIR: ', process.env.RAZZLE_PUBLIC_DIR);

const getBasename = (url: string) => {
    const location = parsePath(url);
    // eslint-disable-next-line
    const [_, basename] = location.pathname.split('/');

    if (basename) {
        return `/${basename}`;
    }

    return '/hiring';
};

const renderApp = (tree: React.ReactNode, extractor) => {
    const styledComponentsSheet = new ServerStyleSheet();
    const muiSheet = new MuiServerStyleSheets();

    try {
        const html = renderToString(extractor.collectChunks(styledComponentsSheet.collectStyles(muiSheet.collect(tree))));
        const styledComponentStyleTags = styledComponentsSheet.getStyleTags();
        const muiStyleTags = muiSheet.toString();

        const scriptTags = extractor.getScriptTags();
        const linkTags = extractor.getLinkTags();

        return { html, styledComponentStyleTags, muiStyleTags, scriptTags, linkTags };
    } catch (err) {
        // eslint-disable-next-line
        console.log('err: ', err);
    } finally {
        styledComponentsSheet.seal();
    }

    return {};
};

const indexHtml = ({ assets, html, styledComponentStyleTags, muiStyleTags, relayData, scriptTags, linkTags }) => {
    return `
    <!doctype html>
      <html lang="">
      <head>
          <meta http-equiv="X-UA-Compatible" content="IE=edge" />
          <meta charset="utf-8" />
          <title>Relay Razzle</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          ${assets.client.css ? `<link rel="stylesheet" href="${assets.client.css}">` : ''}
          ${linkTags}
          ${styledComponentStyleTags}
          ${muiStyleTags ? `<style id='jss-ssr'>${muiStyleTags}</style>` : ''}
          ${
      process.env.NODE_ENV === 'production'
        ? `<script src="${assets.client.js}" defer></script>`
        : `<script src="${assets.client.js}" defer crossorigin></script>`
    }
          ${scriptTags}
      </head>
      <body>
        <div id="root">${html}</div>
        <script>
          window.__RELAY_PAYLOADS__ = ${serialize(relayData, { isJSON: true })};
        </script>      
      </body>
    </html>
  `;
};

// Initialize `koa-router` and setup a route listening on `GET /*`
// Logic has been splitted into two chained middleware functions
// @see https://github.com/alexmingoia/koa-router#multiple-middleware
const router = new Router();

// TODO - make /graphql accept cookies

const getRoutes = () => {
    return [];
};

router.get('/*', async ctx => {
    try {
        const context = {};

        // eslint-disable-next-line
        console.log('* ', ctx.url, ctx.request.hostname);

        // global to fix hostname
        global.ssr = {};
        global.ssr.hostname = ctx.request.hostname;
        global.ssr.sessionCookie = ctx.cookies.get(SESSION_COOKIE);

        // eslint-disable-next-line
        console.log('sessionCookie: ', ctx.req.headers.cookie, global.ssr);

        const extractor = new ChunkExtractor({
            statsFile: path.resolve(cwd, 'build/loadable-stats.json'),
            entrypoints: ['client'],
        });

        const basename = getBasename(ctx.url);

        const serverHistory = getMockHistory({ context, location: ctx.url, basename });

        // TODO - get routes
        const routes = getRoutes();

        const initialEntries = getInitialEntries(routes, serverHistory);

        // eslint-disable-next-line
        console.log(
          'initialEntries: ',
          initialEntries.map(r => r.route.name),
        );

        const environment = initEnvironment();

        // TODO - get theme based on domainname + company
        await fetchMatchesQueries(environment, initialEntries);

        const { html, styledComponentStyleTags, muiStyleTags, scriptTags, linkTags } = renderApp(
          <ChunkExtractorManager extractor={extractor}>
              <RelayEnvironmentProvider environment={environment}>
                  <StaticRouter context={context} location={ctx.url} basename={basename}>
                      <App />
                  </StaticRouter>
              </RelayEnvironmentProvider>
          </ChunkExtractorManager>,
          extractor,
        );

        if (context.url) {
            ctx.redirect(context.url);
            return;
        }

        const queryRecords = environment
          .getStore()
          .getSource()
          .toJSON();


        // eslint-disable-next-line
        ctx.status = 200;
        // eslint-disable-next-line
        ctx.body = indexHtml({
            assets,
            html,
            styledComponentStyleTags,
            muiStyleTags,
            relayData: queryRecords,
            scriptTags,
            linkTags,
        });
    } catch (err) {
        // eslint-disable-next-line
        console.log('server error: ', err);

        if ([400, 401, 402, 403, 404].includes(err?.res?.status)) {
            ctx.redirect('/');
            return;
        }

        // eslint-disable-next-line
        ctx.response.type = 'text';
        // eslint-disable-next-line
        ctx.status = 500;
        // eslint-disable-next-line
        ctx.body = err.toString();
    }
});

// Intialize and configure Koa application
const server = new Koa();
server
  .use(logger())
  // `koa-helmet` provides security headers to help prevent common, well known attacks
  // @see https://helmetjs.github.io/
  .use(helmet())
  // Serve static files located under `process.env.RAZZLE_PUBLIC_DIR`
  .use(serve(process.env.RAZZLE_PUBLIC_DIR))
  .use(router.routes())
  .use(router.allowedMethods());

server.on('error', err => {
    // eslint-disable-next-line no-console
    console.error('Error while answering request', err);
});

export default server;
