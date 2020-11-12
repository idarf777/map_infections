import React from 'react';
import { HashRouter, Route } from 'react-router-dom'; // BrowserRouterはnpm run buildされると動作しない
import PageMap from "./PageMap.js";
import PageChart from "./PageChart.js";

const App = () => {
  return (
    <div>
      <HashRouter>
        <div>
          <Route path={["/", "/index.html"]} exact component={ process.env.REACT_APP_INDEX_PAGE_CHART ? PageChart : PageMap} />
          <Route path="/map" exact component={PageMap} />
          <Route path="/chart" exact component={PageChart} />
        </div>
      </HashRouter>
    </div>
  );
};

export default App;
