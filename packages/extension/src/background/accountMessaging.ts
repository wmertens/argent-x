import { constants, number } from "starknet"

import { getAccounts, removeAccount } from "../shared/account/store"
import { tryToMintFeeToken } from "../shared/devnet/mintFeeToken"
import { AccountMessage } from "../shared/messages/AccountMessage"
import { deployAccountAction } from "./accountDeploy"
import { upgradeAccount } from "./accountUpgrade"
import { sendMessageToUi } from "./activeTabs"
import { analytics } from "./analytics"
import { HandleMessage, UnhandledMessage } from "./background"
import { encryptForUi } from "./crypto"
import { getMultisigAccountData } from "./multisig"
import { addTransaction } from "./transactions/store"

export const handleAccountMessage: HandleMessage<AccountMessage> = async ({
  msg,
  background: { wallet, actionQueue },
  messagingKeys: { privateKey },
  respond,
}) => {
  switch (msg.type) {
    case "GET_ACCOUNTS": {
      return sendMessageToUi({
        type: "GET_ACCOUNTS_RES",
        data: await getAccounts(msg.data?.showHidden ? () => true : undefined),
      })
    }

    case "CONNECT_ACCOUNT": {
      // Select an Account of BaseWalletAccount type
      const selectedAccount = await wallet.getSelectedAccount()

      return respond({
        type: "CONNECT_ACCOUNT_RES",
        data: selectedAccount,
      })
    }

    case "NEW_ACCOUNT": {
      if (!(await wallet.isSessionOpen())) {
        throw Error("you need an open session")
      }

      const { networkId, type } = msg.data
      try {
        const account = await wallet.newAccount(networkId, type)

        tryToMintFeeToken(account)

        analytics.track("createAccount", {
          status: "success",
          networkId,
          type: type || "standard",
        })

        const accounts = await getAccounts()

        return sendMessageToUi({
          type: "NEW_ACCOUNT_RES",
          data: {
            account,
            accounts,
          },
        })
      } catch (exception) {
        const error = `${exception}`

        analytics.track("createAccount", {
          status: "failure",
          networkId: networkId,
          type: type || "standard",
          errorMessage: error,
        })

        return sendMessageToUi({
          type: "NEW_ACCOUNT_REJ",
          data: { error },
        })
      }
    }

    case "NEW_MULTISIG_ACCOUNT": {
      if (!(await wallet.isSessionOpen())) {
        throw Error("you need an open session")
      }

      const { networkId, signers, threshold, creator } = msg.data
      try {
        const account = await wallet.newAccount(networkId, "multisig", {
          signers,
          threshold,
          creator,
        })
        tryToMintFeeToken(account)

        analytics.track("createAccount", {
          status: "success",
          networkId,
          type: "multisig",
        })

        const accounts = await getAccounts()

        return sendMessageToUi({
          type: "NEW_MULTISIG_ACCOUNT_RES",
          data: {
            account,
            accounts,
          },
        })
      } catch (exception) {
        const error = `${exception}`

        analytics.track("createAccount", {
          status: "failure",
          networkId: networkId,
          type: "multisig",
          errorMessage: error,
        })

        return sendMessageToUi({
          type: "NEW_MULTISIG_ACCOUNT_REJ",
          data: { error },
        })
      }
    }

    case "GET_CALCULATED_MULTISIG_ADDRESS": {
      try {
        const address = await wallet.getCalculatedMultisigAddress(msg.data)

        return sendMessageToUi({
          type: "GET_CALCULATED_MULTISIG_ADDRESS_RES",
          data: address,
        })
      } catch (e) {
        console.error(e)
        return sendMessageToUi({
          type: "GET_CALCULATED_MULTISIG_ADDRESS_REJ",
        })
      }
    }

    case "DEPLOY_ACCOUNT": {
      try {
        await deployAccountAction({
          account: msg.data,
          actionQueue,
        })

        return sendMessageToUi({ type: "DEPLOY_ACCOUNT_RES" })
      } catch (e) {
        return sendMessageToUi({ type: "DEPLOY_ACCOUNT_REJ" })
      }
    }

    case "GET_SELECTED_ACCOUNT": {
      const selectedAccount = await wallet.getSelectedAccount()
      return sendMessageToUi({
        type: "GET_SELECTED_ACCOUNT_RES",
        data: selectedAccount,
      })
    }

    case "UPGRADE_ACCOUNT": {
      try {
        await upgradeAccount({
          account: msg.data.wallet,
          wallet,
          actionQueue,
          targetImplementationType: msg.data.targetImplementationType,
        })
        return sendMessageToUi({ type: "UPGRADE_ACCOUNT_RES" })
      } catch {
        return sendMessageToUi({ type: "UPGRADE_ACCOUNT_REJ" })
      }
    }

    case "REDEPLOY_ACCOUNT": {
      try {
        const account = msg.data
        const fullAccount = await wallet.getAccount(account)
        const { txHash } = await wallet.redeployAccount(fullAccount)
        addTransaction({
          hash: txHash,
          account: fullAccount,
          meta: { title: "Redeploy wallet", type: "DEPLOY_ACCOUNT" },
        })
        return sendMessageToUi({
          type: "REDEPLOY_ACCOUNT_RES",
          data: {
            txHash,
            address: account.address,
          },
        })
      } catch {
        return sendMessageToUi({ type: "REDEPLOY_ACCOUNT_REJ" })
      }
    }

    case "DELETE_ACCOUNT": {
      try {
        await removeAccount(msg.data)
        return sendMessageToUi({ type: "DELETE_ACCOUNT_RES" })
      } catch {
        return sendMessageToUi({ type: "DELETE_ACCOUNT_REJ" })
      }
    }

    case "GET_ENCRYPTED_PRIVATE_KEY": {
      if (!(await wallet.isSessionOpen())) {
        throw Error("you need an open session")
      }

      const encryptedPrivateKey = await encryptForUi(
        await wallet.getPrivateKey(),
        msg.data.encryptedSecret,
        privateKey,
      )

      return sendMessageToUi({
        type: "GET_ENCRYPTED_PRIVATE_KEY_RES",
        data: { encryptedPrivateKey },
      })
    }

    case "GET_PUBLIC_KEY": {
      const publicKey = await wallet.getPublicKey(msg.data)

      return sendMessageToUi({
        type: "GET_PUBLIC_KEY_RES",
        data: { publicKey },
      })
    }

    case "GET_ENCRYPTED_SEED_PHRASE": {
      if (!(await wallet.isSessionOpen())) {
        throw Error("you need an open session")
      }

      const encryptedSeedPhrase = await encryptForUi(
        await wallet.getSeedPhrase(),
        msg.data.encryptedSecret,
        privateKey,
      )

      return sendMessageToUi({
        type: "GET_ENCRYPTED_SEED_PHRASE_RES",
        data: { encryptedSeedPhrase },
      })
    }

    case "GET_NEXT_PUBLIC_KEY": {
      try {
        const publicKey = await wallet.getNextPublicKey(msg.data.networkId)

        return sendMessageToUi({
          type: "GET_NEXT_PUBLIC_KEY_RES",
          data: { publicKey },
        })
      } catch (e) {
        console.error(e)
        return sendMessageToUi({
          type: "GET_NEXT_PUBLIC_KEY_REJ",
        })
      }
    }

    case "DEPLOY_ACCOUNT_ACTION_FAILED": {
      return await actionQueue.remove(msg.data.actionHash)
    }

    case "ACCOUNT_CHANGE_GUARDIAN": {
      try {
        const { account, guardian } = msg.data
        await actionQueue.push({
          type: "TRANSACTION",
          payload: {
            transactions: {
              contractAddress: account.address,
              entrypoint: "changeGuardian",
              calldata: [number.hexToDecimalString(guardian || constants.ZERO)],
            },
            meta: {
              isChangeGuardian: true,
              title: "Change account guardian",
              type: "INVOKE_FUNCTION",
            },
          },
        })
        return sendMessageToUi({
          type: "ACCOUNT_CHANGE_GUARDIAN_RES",
        })
      } catch (error) {
        return sendMessageToUi({
          type: "ACCOUNT_CHANGE_GUARDIAN_REJ",
          data: `${error}`,
        })
      }
    }

    case "ACCOUNT_CANCEL_ESCAPE": {
      try {
        const { account } = msg.data
        await actionQueue.push({
          type: "TRANSACTION",
          payload: {
            transactions: {
              contractAddress: account.address,
              entrypoint: "cancelEscape",
              calldata: [],
            },
            meta: {
              isCancelEscape: true,
              title: "Cancel escape",
              type: "INVOKE_FUNCTION",
            },
          },
        })
        return sendMessageToUi({
          type: "ACCOUNT_CANCEL_ESCAPE_RES",
        })
      } catch (error) {
        return sendMessageToUi({
          type: "ACCOUNT_CANCEL_ESCAPE_REJ",
          data: `${error}`,
        })
      }
    }

    case "GET_MULTISIG_ACCOUNT": {
      try {
        const { address, networkId } = msg.data
        const multisigAccount = await getMultisigAccountData({
          address,
          networkId,
        })
        return multisigAccount
      } catch (error) {
        return sendMessageToUi({
          type: "GET_MULTISIG_ACCOUNT_REJ",
          data: `${error}`,
        })
      }
    }
  }

  throw new UnhandledMessage()
}
