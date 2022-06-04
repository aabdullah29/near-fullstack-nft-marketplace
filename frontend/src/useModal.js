import { useState } from "react";

const useModal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isVisibleSale, setIsVisibleSale] = useState(false);
  const [isVisibleBuy, setIsVisibleBuy] = useState(false);
  function toggleModal() {
    setIsVisible(!isVisible);
  }
  function toggleSaleModal() {
    setIsVisibleSale(!isVisibleSale);
  }
  function toggleBuyModal() {
    setIsVisibleBuy(!isVisibleBuy);
  }
  return {
    isVisible,
    toggleModal,
    isVisibleSale,
    toggleSaleModal,
    isVisibleBuy,
    toggleBuyModal,
  };
};
export default useModal;