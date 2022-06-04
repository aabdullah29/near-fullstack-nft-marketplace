#!/bin/bash
# set -e && RUSTFLAGS='-C link-arg=-s' cargo build --target wasm32-unknown-unknown --release && mkdir -p ../out && cp target/wasm32-unknown-unknown/release/*.wasm ../out/market.wasm
set -e && RUSTFLAGS='-C link-arg=-s' cargo build --target wasm32-unknown-unknown --release && mkdir -p ./res && cp target/wasm32-unknown-unknown/release/*.wasm ./res/market_contract.wasm
