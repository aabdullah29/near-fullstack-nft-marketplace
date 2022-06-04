import * as React from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./Close";


const Modal = ({ isVisible, isVisibleSale, isVisibleBuy, hideModal, children }) => {
  return isVisible || isVisibleSale || isVisibleBuy 
    ? createPortal(
        <React.Fragment>
          <div className="modal-overlay">
            <div className="close-wrapper">
              <button className="sbutton" aria-label="Close dialog" onClick={hideModal}><CloseIcon/></button>
            </div>
            {children}
          </div>
          ,
        </React.Fragment>,

        document.body
      )
    : null;
};

export default Modal