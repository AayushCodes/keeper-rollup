import { ethers } from "ethers";
import { stackrConfig } from "../stackr.config";
import { ActionSchema } from "@stackr/stackr-js";

const actionSchemaType = {
  type: "String",
  from: "String",
  to: "String",
  amount: "String",
  nonce: "Uint",
};

const actionInput = new ActionSchema("update-keeper", actionSchemaType);

const getData = async (nonce: number) => {
  const wallet = new ethers.Wallet(
    "5af06e43a75c9b82bb469f050a882f33aa9d628453cd2d2f31d0ca822e38cc6f"
  );

  const data = {
    type: "burn",
    from: wallet.address,
    to: "0x979955aD4c50F5800EcA3B598dB60fE6A39C4e8C",
    amount: "1000000000000",
    nonce: nonce,
  };

  console.log(data);

  const sign = await wallet.signTypedData(
    stackrConfig.domain,
    actionInput.EIP712TypedData.types,
    data
  );
  console.log(actionInput.EIP712TypedData.types);

  const payload = JSON.stringify({
    msgSender: wallet.address,
    signature: sign,
    payload: data,
  });

  console.log(payload);

  return payload;
};

const run = async () => {
  const start = Date.now();
  const payload = await getData(start);

  const res = await fetch("http://localhost:3000/burn", {
    method: "POST",
    body: payload,
    headers: {
      "Content-Type": "application/json",
    },
  });

  console.log(res);

  // const end = Date.now();

  // const json = await res.json();

  // const elapsedSeconds = (end - start) / 1000;
  // const requestsPerSecond = 1 / elapsedSeconds;

  // console.log(`Requests per second: ${requestsPerSecond.toFixed(2)}`);
  // console.log("response : ", json);
};

// function delay(ms: number) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// let sent = 0;

await run();
