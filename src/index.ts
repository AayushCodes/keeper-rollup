import {
  ActionSchema,
  FIFOStrategy,
  MicroRollup,
  ConfirmationEvents,
} from "@stackr/stackr-js";
import bodyParser from "body-parser";
import { ethers } from "ethers";
import express, { Request, Response } from "express";
import { stackrConfig } from "../stackr.config";
import { KeeperNetwork, keeperSTF } from "./state";
import { StateMachine } from "@stackr/stackr-js/execution";
import abi from "../abi.json";
import * as genesisState from "../genesis-state.json";
var cors = require("cors");

/* 
Global Constants
*/

const actionSchemaType = {
  type: "String",
  from: "String",
  to: "String",
  amount: "String",
  nonce: "Uint",
};

const actionInput = new ActionSchema("update-keeper", actionSchemaType);

const rpcUrl = "https://goerli.base.org";
const provider = new ethers.JsonRpcProvider(rpcUrl);
const contractAddress = "0xDE18c74C753b7a96A24B995ac94222D2F7A4CCD8";
const myContract = new ethers.Contract(contractAddress, abi.abi, provider);

const wallet = new ethers.Wallet(
  "5af06e43a75c9b82bb469f050a882f33aa9d628453cd2d2f31d0ca822e38cc6f",
  provider
);

/* 
Initialising the rollup
*/

const rollup = async () => {
  const keeperFsm = new StateMachine({
    state: new KeeperNetwork(genesisState.state),
    stf: keeperSTF,
  });

  const buildStrategy = new FIFOStrategy();

  const { state, actions, events } = await MicroRollup({
    config: stackrConfig,
    useState: keeperFsm,
    useAction: actionInput,
    useBuilder: { strategy: buildStrategy, autorun: true },
    useSyncer: { autorun: true },
  });

  return { state, actions, events };
};

/*
Express App Config
*/

const app = express();
const corsOptions = {
  origin: true, // or true to allow any origin
  optionsSuccessStatus: 200,
};
app.options("*", cors(corsOptions)); // Enable pre-flight for all routes
app.use(cors(corsOptions));
app.use(bodyParser.json());
const { actions, state, events } = await rollup();
const schema = actions.getSchema("update-keeper");

app.get("/", (req: Request, res: Response) => {
  res.send({ allAccounts: state.get().state.getState() });
});

/* 
This post request does not go in the prod, just for testing purposes
*/

// app.post("/", async (req: Request, res: Response) => {
//   const schema = actions.getSchema("update-keeper");
//   console.log(req.body);

//   if (!schema) {
//     res.status(400).send({ message: "error" });
//     return;
//   }

//   try {
//     const newAction = schema.newAction(req.body);
//     const ack = await actions.submit(newAction);
//     res.status(201).send({ ack });
//   } catch (e: any) {
//     res.status(400).send({ error: e.message });
//   }
// });

app.post("/burn", async (req: Request, res: Response) => {
  if (!schema) {
    res.status(400).send({ message: "error" });
    return;
  }

  try {
    const newAction = schema.newAction(req.body);
    const ack = await actions.submit(newAction);

    events.confirmation.onEvent(
      ConfirmationEvents.C3_CONFIRMATION,
      async (data) => {
        console.log("C3 Confirmation Event Detected");
        const amountInWei = BigInt(req.body.payload.amount);
        const myContract = new ethers.Contract(
          contractAddress,
          abi.abi,
          wallet
        );
        const tx = await myContract.unlock(req.body.payload.to, amountInWei);
        console.log(tx);
        await tx.wait();
      }
    );

    res.status(201).send({ ack: ack });
  } catch (e: any) {
    res.status(400).send({ error: e.message });
  }
});

app.listen(3000, () => {
  console.log("listening on port 3000");
});

/*
Event listeners for the contract
*/

try {
  myContract.on("Locked", async (user, amount, event) => {
    console.log(`Locked Event Detected`);
    console.log(`User: ${user}`);
    console.log(`Amount: ${amount.toString()}`);
    await mint(amount.toString(), user);
  });
} catch (err) {
  console.log(err);
}

const mint = async (amount: string, address: string) => {
  const nonce = Date.now();
  const data = {
    type: "mint",
    from: wallet.address,
    to: address,
    amount: amount,
    nonce: nonce,
  };

  const sign = await wallet.signTypedData(
    stackrConfig.domain,
    actionInput.EIP712TypedData.types,
    data
  );
  console.log(actionInput.EIP712TypedData.types);

  const payload = {
    msgSender: wallet.address,
    signature: sign,
    payload: data,
  };

  console.log(payload);

  if (!schema) {
    console.log("No schema");
    return;
  }

  try {
    const newAction = schema.newAction(payload);
    const ack = await actions.submit(newAction);
    console.log(ack);
  } catch (e: any) {
    console.log("error");
  }
};
