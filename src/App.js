import React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import PageMap from "./PageMap.js";
import PageChart from "./PageChart.js";

const App = () => {
  return (
    <div>
      <BrowserRouter>
        <div>
          <Route path={["/", "/index.html"]} exact component={PageMap} />
          <Route path="/chart" exact component={PageChart} />
        </div>
      </BrowserRouter>
    </div>
  );
};

export default App;
