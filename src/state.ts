import { RollupState, STF } from "@stackr/stackr-js/execution";
import { ethers } from "ethers";

export type StateVariable = {
  address: string;
  balance: string;
}[];

interface StateTransport {
  allAccounts: StateVariable;
}

export interface KeeperActionInput {
  type: "mint" | "burn";
  from: string;
  to?: string;
  amount?: string;
  nonce: number;
}

export class KeeperNetwork extends RollupState<StateVariable, StateTransport> {
  constructor(accounts: StateVariable) {
    super(accounts);
  }

  createTransport(state: StateVariable): StateTransport {
    return { allAccounts: state };
  }

  getState(): StateVariable {
    return this.transport.allAccounts;
  }

  calculateRoot(): ethers.BytesLike {
    return ethers.solidityPackedKeccak256(
      ["string"],
      [JSON.stringify(this.transport.allAccounts)]
    );
  }
}

export const keeperSTF: STF<KeeperNetwork, KeeperActionInput> = {
  identifier: "keeperSTF",

  apply(inputs: KeeperActionInput, state: KeeperNetwork): void {
    let newState = state.getState();
    let senderIndex = newState.findIndex(
      (account) => account.address === inputs.from
    );
    let receiverIndex = newState.findIndex(
      (account) => account.address === inputs.to
    );
    if (senderIndex === -1) {
      newState.push({
        address: inputs.from,
        balance: "0",
      });
      senderIndex = newState.findIndex(
        (account) => account.address === inputs.from
      );
    }
    switch (inputs.type) {
      case "mint":
        if (receiverIndex === -1) {
          newState.push({
            address: inputs.to!,
            balance: "0",
          });
          receiverIndex = newState.findIndex(
            (account) => account.address === inputs.to
          );
        }
        newState[receiverIndex].balance = (
          BigInt(newState[receiverIndex].balance) + BigInt(inputs.amount!)
        ).toString();
        break;
      case "burn":
        if (BigInt(newState[senderIndex].balance) < BigInt(inputs.amount!)) {
          throw new Error("Insufficient balance");
        }
        newState[senderIndex].balance = (
          BigInt(newState[senderIndex].balance) - BigInt(inputs.amount!)
        ).toString();
        break;
    }
    state.transport.allAccounts = newState;
  },
};
