import React, { useEffect, useState } from "react";
import "./App.css";
import useModal from "./useModal";
import Modal from "./Modal";
import nearLogo from "./assets/near-logo.svg";
import * as nearAPI from "near-api-js";

const initialValues = {
  assetTitle: "",
  assetDescription: "",
  assetUrl: "",
  assetPrice: "",
  assetBuy: "",
};

const App = ({ currentUser, nearConfig, walletConnection }) => {

  const {
    utils: {
      format: { parseNearAmount },
    },
  } = nearAPI;
  const [showLoader, setShowLoader] = useState(false);
  const [values, setValues] = useState(initialValues);


  const {
    isVisible,
    isVisibleSale,
    isVisibleBuy,
    toggleModal,
    toggleSaleModal,
    toggleBuyModal,
  } = useModal();

  const [nftResults, setNftResults] = useState([]);
  const [nftMarketResults, setNftMarketResults] = useState([]);
  const [getMinimum, setMinimum] = useState("");

  const signIn = () => {
    walletConnection.requestSignIn(
      nearConfig.contractName,
      "", // title. Optional, by the way
      "", // successUrl. Optional, by the way
      "" // failureUrl. Optional, by the way
    );
    sendMeta();
  };

  useEffect(() => {
    if (!showLoader) {

      const local_token_id = localStorage.getItem("token_id");
      if (local_token_id != null) {
        approveNFTForSale(local_token_id);
      }

      displayAllNFT();
      loadSaleItems();
    }
  }, [showLoader]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setValues({
      ...values,
      [name]: value,
    });
  };

  const loadSaleItems = async () => {
    let nftTokens = await walletConnection
      .account()
      .viewFunction(nearConfig.contractName, "nft_tokens", {
        from_index: "0",
        limit: 64,
      });

    let saleTokens = await walletConnection
      .account()
      .viewFunction(
        nearConfig.marketContractName,
        "get_sales_by_nft_contract_id",
        {
          nft_contract_id: nearConfig.contractName,
          from_index: "0",
          limit: 64,
        }
      );

    let sales = [];

    for (let i = 0; i < nftTokens.length; i++) {
      const { token_id } = nftTokens[i];
      let saleToken = saleTokens.find(({ token_id: t }) => t === token_id);
      if (saleToken !== undefined) {
        sales[i] = Object.assign(nftTokens[i], saleToken);

      }
    }
    setNftMarketResults(sales);
  };
  const getMinimumStorage = async () => {
    let minimum_balance = await walletConnection.account()
      .viewFunction(nearConfig.marketContractName, "storage_minimum_balance");
    setMinimum(minimum_balance);
    return minimum_balance

  };

  const sendStorageDeposit = async () => {
    const minimum_balance = await getMinimumStorage();
    await console.log('============= sendStorageDeposit ==============> getMinimum: ', getMinimum);
    await console.log('============== sendStorageDeposit =============> minimum_balance: ', minimum_balance);
    localStorage.setItem("minimum_balance", minimum_balance);

    const result = await walletConnection.account().functionCall({
      contractId: nearConfig.marketContractName,
      methodName: "storage_deposit",
      args: {},

      attachedDeposit: minimum_balance,
    })
    console.dir('===========================> result: ', result)
  };

  const sendMeta = async () => {
    let functionCallResult = await walletConnection.account().functionCall({
      contractId: nearConfig.contractName,
      methodName: "new_default_meta",
      args: {
        owner_id: nearConfig.contractName,
      },
      attachedDeposit: 0,
      walletMeta: "",
      wallerCallbackUrl: "",
    });

    if (functionCallResult) {
      console.log("new meta data created: ");
    } else {
      console.log("meta data not created");
    }
  };

  const mintAssetToNft = async () => {
    toggleModal();
    let functionCallResult = await walletConnection.account().functionCall({
      contractId: nearConfig.contractName,
      methodName: "nft_mint",
      args: {
        token_id: `${values.assetTitle}`,
        metadata: {
          title: `${values.assetTitle}`,
          description: `${values.assetDescription}`,
          media: `${values.assetUrl}`,
        },
        gas: nearConfig.GAS,
        receiver_id: currentUser,
      },
      attachedDeposit: parseNearAmount("1"),
    });

    if (functionCallResult) {
      console.log("nft created: ");
    } else {
      console.log("nft not created");
    }
  };

  const approveNFTForSale = async (token_id) => {
    localStorage.setItem("token_id", token_id)
    const min_balance = await localStorage.getItem("minimum_balance")
    const sale_value = await localStorage.getItem("sale_value")

    console.log('====> input sell price: ', typeof (1))
    console.log('====> input sell price: ', typeof (values.assetPrice))

    if (min_balance == null) {
      // await sendStorageDeposit()
      localStorage.setItem("token_id", token_id)
      localStorage.setItem("sale_value", values.assetPrice)
      await sendStorageDeposit()
    } else if (min_balance != null || typeof (sale_value) === typeof (1) && sale_value > 0) {
      await localStorage.removeItem("token_id");
      await localStorage.removeItem("minimum_balance");
      await localStorage.removeItem("sale_value");

      let sale_conditions = {
        // sale_conditions: values.assetPrice,
        sale_conditions: sale_value,
      };
      console.log('====== approveNFTForSale =====================> min_balance: ', min_balance, '\n==> input value: ', sale_conditions, '\n==> token_id: ', token_id)

      const tx = await walletConnection.account().functionCall({
        contractId: nearConfig.contractName,
        methodName: "nft_approve",
        args: {
          token_id: token_id,
          account_id: nearConfig.marketContractName,
          msg: JSON.stringify(sale_conditions),
        },
        attachedDeposit: parseNearAmount("0.01"),
      });
      console.log('===========================> Tx: ', tx)
    }
  };

  const OfferPrice = async (token_id) => {
    await walletConnection.account().functionCall({
      contractId: nearConfig.marketContractName,
      methodName: "offer",
      args: {
        nft_contract_id: nearConfig.contractName,
        token_id,
      },
      attachedDeposit: parseNearAmount(values.assetBuy),
      gas: nearConfig.GAS,
    })
  }

  const displayAllNFT = async () => {
    let userNFTs = await walletConnection
      .account()
      .viewFunction(nearConfig.contractName, "nft_tokens_for_owner", {
        account_id: currentUser,
        from_index: "0",
        limit: 64,
      });
    setNftResults(userNFTs);
    setShowLoader(true);
  };

  const signOut = () => {
    walletConnection.signOut();
    window.location.replace(window.location.origin + window.location.pathname);
  };

  return (
    <div>
      <header className="top-header">
        <div className="menu">
          <div className="navbar-left">
            <div className="logo-img">
              <a href="https://www.optimusfox.com/"> <img src="https://www.optimusfox.com/wp-content/uploads/2021/12/logo-520x94-d-bg@2x.png"></img> </a> 
            </div>
          </div>
          <nav className="navbar">
            <ul className="navbar-ul">
              <li className="navbar-li pt-3 pr-2">
                {currentUser ? (
                  <button href="#" className="log-link" onClick={signOut}>
                    Log out
                  </button>
                ) : (
                  <button href="#" className="log-link" onClick={signIn}>
                    Log In
                  </button>
                )}
              </li>
              <li className="navbar-li">
                {currentUser ? (
                  <button className="btn" onClick={toggleModal}>
                    Create NFT
                  </button>
                ) : (
                  ""
                )}
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="main-wrapper">
        <div className="login-wrapper">
          {currentUser ? (
            <div className="welcome-wrapper">
              <span className="welcome-text">Welcome! </span>
              {currentUser}
            </div>
          ) : (
            "user not logged in"
          )}
        </div>
      </main>

      <div className="gallery-wrapper">
        {nftResults
          ? nftResults.map((nft, index) => (
            <div className="outter-wrapper" key={index}>
              <Modal
                isVisibleSale={isVisibleSale}
                hideModal={toggleSaleModal}
              >
                <div className="outform-wrapper">
                  <div className="form-wrapper">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        approveNFTForSale(nft.metadata.title);
                      }}
                    >
                      <div className="form-in-wrapper">
                        <h3 className="text-center pb-1">SELL NFT</h3>

                        <div className="box-wrapper">
                          <div className="box-in-wrapper">
                            <div className="input-wrapper">
                              <input
                                className="input-box"
                                placeholder="Add sale price"
                                name="assetPrice"
                                type="text"
                                value={values.assetPrice}
                                onChange={handleInputChange}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="form-btn-wrapper">
                          <button className="form-btn">Sell now</button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </Modal>
              <article className="card-wrapper">
                <a className="asset-anchor" href="#">
                  <div className="asset-anchor-wrapper">
                    <div className="asset-anchor-wrapper-inner">
                      <div className="asset-anchor-wrapper-inner-2">
                        <img
                          src={nft.metadata.media}
                          className="img-wrapper"
                          alt="NFT Token"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="details-wrapper">
                    <div className="details-title-wrapper">
                      <div className="details-title-left-wrapper">
                        <div className="details-title-left-wrapper-inner-1">
                          {nft.metadata.title}
                        </div>
                        <div className="details-title-left-wrapper-inner-2">
                          {nft.owner_id}
                        </div>
                      </div>
                      <div className="details-title-right-wrapper">
                        <div className="details-assets-right-wrapper-inner-1">
                          <span className="span-price">Price</span>
                          <div className="price-wrapper">
                            <div className="near-symbol">
                              <img
                                className="near-logo"
                                src={nearLogo}
                                alt="near logo"
                              />
                            </div>
                            <div className="price">-</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="sell-wrapper">
                    <button className="form-btn" onClick={toggleSaleModal}>
                      Sell now
                    </button>
                  </div>
                </a>
              </article>
            </div>
          ))
          : "NFTs not found"}
      </div>

      <div className="market-wrapper">
        <div className="market-inner-wrapper">
          {nftMarketResults.length !== 0 ? (
            <div className="market-header">
              <h3>Market Place</h3>
            </div>
          ) : null}

{/* 
          <div className="card" style={{ width: '250px', height: 'auto', background: `radialGradient(circle, rgba(255, 255, 255, 0.05) 0%, rgb(233, 166, 9) 0%, rgba(255, 255, 255, 0.05) 70%)` }}>
            <img className="nft-image" src="https://images.unsplash.com/photo-1541661538396-53ba2d051eed?ixlib=rb-1.2.1&amp;ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&amp;auto=format&amp;fit=crop&amp;w=627&amp;q=80" />
            <div className="wrapper">
              <div className="info-container">
                <p className="owner"> LEJOURN.DARK.NFT</p>
                <p className="name">Alien Cry</p></div>
              <div className="price-container">
                <p className="price-label">Price</p>
                <p className="price">
                  <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 320 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                    {/* <path d="M311.9 260.8L160 353.6 8 260.8 160 0l151.9 260.8zM160 383.4L8 290.6 160 512l152-221.4-152 92.8z"></path> */}
                  {/* </svg> 4.555</p>
              </div>
            </div>
            <div className="buttons">
              <button className="default-button" style={{ width: '80px', height: '30px', color: 'rgb(255, 255, 255)', border: '1px solid rgb(255, 255, 255)', backgroundColor: 'transparent' }}>Buy Now</button>
              <div className="like-container">
                <button className="like">
                  <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 1024 1024" color="white" height="30" width="30" xmlns="http://www.w3.org/2000/svg" style={{ color: 'white' }}>
                    <path d="M923 283.6a260.04 260.04 0 0 0-56.9-82.8 264.4 264.4 0 0 0-84-55.5A265.34 265.34 0 0 0 679.7 125c-49.3 0-97.4 13.5-139.2 39-10 6.1-19.5 12.8-28.5 20.1-9-7.3-18.5-14-28.5-20.1-41.8-25.5-89.9-39-139.2-39-35.5 0-69.9 6.8-102.4 20.3-31.4 13-59.7 31.7-84 55.5a258.44 258.44 0 0 0-56.9 82.8c-13.9 32.3-21 66.6-21 101.9 0 33.3 6.8 68 20.3 103.3 11.3 29.5 27.5 60.1 48.2 91 32.8 48.9 77.9 99.9 133.9 151.6 92.8 85.7 184.7 144.9 188.6 147.3l23.7 15.2c10.5 6.7 24 6.7 34.5 0l23.7-15.2c3.9-2.5 95.7-61.6 188.6-147.3 56-51.7 101.1-102.7 133.9-151.6 20.7-30.9 37-61.5 48.2-91 13.5-35.3 20.3-70 20.3-103.3.1-35.3-7-69.6-20.9-101.9zM512 814.8S156 586.7 156 385.5C156 283.6 240.3 201 344.3 201c73.1 0 136.5 40.8 167.7 100.4C543.2 241.8 606.6 201 679.7 201c104 0 188.3 82.6 188.3 184.5 0 201.2-356 429.3-356 429.3z">
                    </path>
                  </svg>
                </button>
                <p className="like-count">123</p>
              </div>
            </div>
          </div> */} 


          <div className="market-result-wrapper">
            {nftMarketResults
              ? nftMarketResults.map((nft, index) => (
                <div className="outter-wrapper" key={index}>
                  <Modal
                    isVisibleBuy={isVisibleBuy}
                    hideModal={toggleBuyModal}
                  >
                    <div className="outform-wrapper">
                      <div className="form-wrapper">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            OfferPrice(nft.token_id);
                          }}
                        >
                          <div className="form-in-wrapper">
                            <h3 className="text-center pb-1">BUY</h3>

                            <div className="box-wrapper">
                              <div className="box-in-wrapper">
                                <div className="input-wrapper">
                                  <input
                                    className="input-box"
                                    placeholder="Add price"
                                    name="assetBuy"
                                    type="text"
                                    value={values.assetBuy}
                                    onChange={handleInputChange}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="form-btn-wrapper">
                              <button className="form-btn">Enter Buy</button>
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  </Modal>

                  {/* <div className="card" style={{ width: '250px', height: 'auto', background: `radialGradient(circle, rgba(255, 255, 255, 0.05) 0%, rgb(233, 166, 9) 0%, rgba(255, 255, 255, 0.05) 70%)` }}>
                    <img className="nft-image" src={nft.metadata.media} />
                    <div className="wrapper">
                      <div className="info-container">
                        <p className="name">Title: 	&#160; {nft.token_id}</p>
                        <p className="owner">Owner: 	&#160; {nft.owner_id}</p>
                        </div>
                    </div>
                    <div className="buttons">
                      <button className="default-button" style={{ width: '80px', height: '30px', color: 'rgb(255, 255, 255)', border: '1px solid rgb(255, 255, 255)', backgroundColor: 'transparent' }}>Buy Now</button>
                      <div className="like-container">

                      <p className="">
                      <img
                            className="near-logo"
                            src={nearLogo}
                            alt="near logo"
                        />
                        &#160;
                        {nft.sale_conditions} 	

                        </p>
                      </div>
                    </div>
                  </div> */}


                  <article className="card-wrapper">
                    <a className="asset-anchor" href="#">
                      <div className="asset-anchor-wrapper">
                        <div className="asset-anchor-wrapper-inner">
                          <div className="asset-anchor-wrapper-inner-2">
                            <img
                              src={nft.metadata.media}
                              className="img-wrapper"
                              alt="NFT Token"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="details-wrapper">
                        <div className="details-title-wrapper">
                          <div className="details-title-left-wrapper">
                            <div className="details-title-left-wrapper-inner-1">
                              {nft.token_id}
                            </div>
                            <div className="details-title-left-wrapper-inner-2">
                              {nft.owner_id}
                            </div>
                          </div>
                          <div className="details-title-right-wrapper">
                            <div className="details-assets-right-wrapper-inner-1">
                              <span className="span-price">Price</span>
                              <div className="price-wrapper">
                                <div className="near-symbol">
                                  <img
                                    className="near-logo"
                                    src={nearLogo}
                                    alt="near logo"
                                  />
                                </div>
                                <div className="price">
                                  {nft.sale_conditions}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </a>

                    <div className="sell-wrapper">
                      {currentUser !== nft.owner_id ? (
                        <button className="form-btn" onClick={toggleBuyModal}>
                          Buy
                        </button>
                      ) : null}
                    </div>
                  </article>
                </div>
              ))
              : "Market NFTs not found"}
          </div>
        </div>
      </div>

      <Modal isVisible={isVisible} hideModal={toggleModal}>
        <div className="outform-wrapper">
          <div className="form-wrapper">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mintAssetToNft();
              }}
            >
              <div className="form-in-wrapper">
                <h3 className="text-center pb-1">MINT NFT</h3>

                <div className="box-wrapper">
                  <div className="box-in-wrapper">
                    <div className="input-wrapper">
                      <input
                        className="input-box"
                        placeholder="Asset Title"
                        name="assetTitle"
                        type="text"
                        value={values.assetTitle}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
                <div className="box-wrapper">
                  <div className="box-in-wrapper">
                    <div className="input-wrapper">
                      <input
                        className="input-box"
                        placeholder="Asset Description"
                        name="assetDescription"
                        type="text"
                        value={values.assetDescription}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
                <div className="box-wrapper">
                  <div className="box-in-wrapper">
                    <div className="input-wrapper">
                      <input
                        className="input-box"
                        placeholder="Asset Url"
                        name="assetUrl"
                        type="text"
                        value={values.assetUrl}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-btn-wrapper">
                  <button className="form-btn">Mint NFT</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;