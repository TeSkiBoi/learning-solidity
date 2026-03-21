const path = require("path");

require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
// Load `.env` from this project root (not from whatever the shell cwd is).
require("dotenv").config({ path: path.join(__dirname, ".env") });

/** @param {string | undefined} raw */
function normalizePrivateKey(raw) {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return "";
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

/** Must be exactly 32 bytes = 64 hex chars (0x optional). */
function isValidPrivateKey(pk) {
  if (!pk) return false;
  const hex = pk.startsWith("0x") ? pk.slice(2) : pk;
  return /^[0-9a-fA-F]{64}$/.test(hex);
}

/** Cached so we only validate/warn once (Hardhat reads the config multiple times). */
let accountsFromEnvCache;
function accountsFromEnv() {
  if (accountsFromEnvCache !== undefined) return accountsFromEnvCache;
  const raw =
    process.env.PRIVATE_KEY || process.env.FUJI_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  const pk = normalizePrivateKey(raw);
  if (!pk) {
    accountsFromEnvCache = [];
    return accountsFromEnvCache;
  }
  if (!isValidPrivateKey(pk)) {
    console.warn(
      "[hardhat] PRIVATE_KEY is invalid or too short. It must be exactly 64 hex characters (32 bytes), optional 0x prefix.\n" +
        "Fix `.env` or use: CONTRACT_NAME=... PRIVATE_KEY=0x... pnpm run deploy:fuji\n" +
        "Ignoring bad key for this run (networks will have no funded account until fixed)."
    );
    accountsFromEnvCache = [];
    return accountsFromEnvCache;
  }
  accountsFromEnvCache = [pk];
  return accountsFromEnvCache;
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: accountsFromEnv(),
    },
    fuji: {
      url: process.env.AVALANCHE_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: accountsFromEnv(),
    },
    avalanche: {
      url: process.env.AVALANCHE_MAINNET_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: accountsFromEnv(),
    },
  },
  verify: {
    // Uses the plugin's Etherscan-like verification workflow.
    // For Avalanche, we route through Snowtrace via `chainDescriptors`.
    etherscan: {
      apiKey: process.env.SNOWTRACE_API_KEY || "",
    },
  },
  chainDescriptors: {
    // Avalanche Fuji
    43113: {
      name: "fuji",
      blockExplorers: {
        etherscan: {
          name: "Snowtrace Fuji",
          url: "https://testnet.snowscan.xyz/",
          apiUrl: "https://api-testnet.snowtrace.io/api",
        },
      },
    },
    // Avalanche C-Chain (Mainnet)
    43114: {
      name: "avalanche",
      blockExplorers: {
        etherscan: {
          name: "Snowtrace",
          url: "https://snowscan.xyz/",
          apiUrl: "https://api.snowtrace.io/api",
        },
      },
    },
  },
};
