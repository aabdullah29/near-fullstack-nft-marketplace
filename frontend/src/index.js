// import React from 'react';
// import ReactDOM from 'react-dom';
// // import ReactDOM from 'react-dom/client';
// import './index.css';
// import App from './App';
// import reportWebVitals from './reportWebVitals';

// // const root = ReactDOM.createRoot(document.getElementById('root'));
// // root.render(
// //   <React.StrictMode>
// //     <App />
// //   </React.StrictMode>
// // );

// ReactDOM.render(<h1>Hello world!</h1>, document.getElementById("root"))

// // If you want to start measuring performance in your app, pass a function
// // to log results (for example: reportWebVitals(console.log))
// // or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();




// update
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import getConfig from './config.js';
import * as nearAPI from 'near-api-js'
import 'regenerator-runtime'

async function initContract() {
  const nearConfig = getConfig(process.env.NEAR_ENV || 'testnet');
  const keyStore = new nearAPI.keyStores.BrowserLocalStorageKeyStore()
  const near =  await nearAPI.connect({keyStore, ...nearConfig})
  const walletConnection = new nearAPI.WalletConnection(near)
  
  let currentUser;

  if (walletConnection.getAccountId()) {
      currentUser = walletConnection.getAccountId()
  }

  return { currentUser, nearConfig, walletConnection}
}


initContract().then(({ currentUser, nearConfig, walletConnection})=> {
  ReactDOM.render(<App currentUser={currentUser} nearConfig={nearConfig} walletConnection={walletConnection}/>,
       document.getElementById('root'));
})
