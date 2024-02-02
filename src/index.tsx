/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route } from "@solidjs/router";
import { lazy } from 'solid-js';
import "./index.css";

const LoginPage = lazy(() => import('./pages/Login'));
const AppPage = lazy(() => import('./pages/App'));

const root = document.getElementById('root')

render(() => (
  <Router>
    <Route path="/" component={LoginPage} />
    <Route path="/app/*" component={AppPage} />
  </Router>
), root!)
