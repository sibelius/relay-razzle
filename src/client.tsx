import 'core-js/stable';
import 'isomorphic-fetch';
import 'regenerator-runtime/runtime';

import React from 'react';
import { hydrate } from 'react-dom';
import App from './App';

hydrate(<App />, document.getElementById('root'));

if (module.hot) {
  module.hot.accept();
}
