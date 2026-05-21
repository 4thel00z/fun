import { APITester } from "./APITester";
import "./index.css";

import logo from "./logo.svg";
import reactLogo from "./react.svg";

export function App() {
  return (
    <div className="app">
      <div className="logo-container">
        <img src={logo} alt="Fun Logo" className="logo fun-logo" />
        <img src={reactLogo} alt="React Logo" className="logo react-logo" />
      </div>

      <h1>Fun + React</h1>
      <p>
        Edit <code>src/App.tsx</code> and save to test HMR
      </p>
      <APITester />
    </div>
  );
}

export default App;
