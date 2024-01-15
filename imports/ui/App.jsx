import {Meteor} from 'meteor/meteor';
import React from 'react';
import {useTracker} from 'meteor/react-meteor-data';
import {LoginForm} from './LoginForm';
import 'antd/dist/antd.css';
import {CodeOrMain} from './CodeOrMain';
import {Button, Space, Spin} from 'antd';
import {BrowserRouter, Link, Outlet, Route, Routes} from "react-router-dom";
import {BacktestingPage} from './Backtest/BacktestingPage';
import HeaderLine from './HeaderLine';
import {DailySummaries} from './DailySummaries/DailySummaries';

function NoMatch() {
  return (
    <div>
      <h2>Trader: Nothing to see here!</h2>
      <p>
        <Link to="/">Go to the trader home page...</Link>
      </p>
    </div>
  );
}

function Layout() {
  const user = useTracker(() => Meteor.user(), [Meteor.users]);

  return (
    <div>
      {/* A "layout route" is a good place to put markup you want to
          share across all the pages on your site, like navigation. */}
      {user ?
        <Space direction={'vertical'}>
          <HeaderLine/>
          <Space direction={'horizontal'}>
            <Button>
              <Link to="/">Home</Link>
            </Button>
            <Button>
              <Link to="/backtesting">Backtesting</Link>
            </Button>
            <Button>
              <Link to="/dailySummaries">Daily Summaries</Link>
            </Button>
          </Space>
          <hr/>
        </Space>
        : null}
      {/* An <Outlet> renders whatever child route is currently active,
          so you can think about this <Outlet> as a placeholder for
          the child routes we defined in the <BrowserRouter>. */}
      <Outlet/>
    </div>
  );
}

function Home() {
  const user = useTracker(() => Meteor.user(), [Meteor.users]);

  const GetView = ({user}) => {
    if (user === undefined) {
      return (<Spin/>);
    }
    if (user === null) {
      return (<LoginForm/>);
    }
    return (<CodeOrMain/>);
  };

  return (
    <div className="main">
      <GetView user={user}/>
    </div>
  );
}

export const App = () => {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout/>}>
            <Route index element={<Home/>}/>
            <Route path="backtesting" element={<BacktestingPage/>}/>
            <Route path="dailySummaries" element={<DailySummaries/>}/>
            <Route path="*" element={<NoMatch/>}/>
          </Route>
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
};