import { ethers } from "ethers";
import { stackrConfig } from "../stackr.config";
import { ActionSchema } from "@stackr/stackr-js";
import {
  actionSchemaType,
  mint,
  burn,
  transfer,
  createStream,
  updateStream,
  deleteStream,
  signAndSend,
  fundRandomWallet
} from "./txTypes";
import { HDNodeWallet } from "ethers";

const activeWallets: HDNodeWallet[] = [];

const run = async () => {

  for (let i = 0; i < 10; i++) {
    activeWallets.push(await fundRandomWallet(1000));
  }

  for (let i = 0; i < 50; i++) {
    // pick a random wallet
    const from = activeWallets[Math.floor(Math.random() * activeWallets.length)];
    // pick a random wallet
    const to = activeWallets[Math.floor(Math.random() * activeWallets.length)];

    let res;
    try{
      res = await signAndSend(from, createStream(from.address, to.address, Math.floor(Math.random() * 100)));
    } catch (e) {
      console.log(e);
      res = await signAndSend(from, updateStream(from.address, to.address, Math.floor(Math.random() * 100)));
    }
    console.log(res);
    
    delay(1000);
  }
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// let sent = 0;

await run();
