const fs = require("fs");
const path = require("path");

const hre = require("hardhat");

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  const networkName = hre.network.name;

  if (!deployer) {
    console.error(
      "No deployer wallet found for this network.\n" +
        "For Fuji or Avalanche mainnet, add your wallet private key to `.env`:\n" +
        "  PRIVATE_KEY=0x...   (or without 0x — both work)\n" +
        "Never commit `.env` or share your key.\n" +
        "Fund the wallet with AVAX on that network for gas (Fuji: use the testnet faucet)."
    );
    process.exit(1);
  }

  console.log("Deploying with account:", deployer.address);
  console.log(
    "Account balance:",
    (await hre.ethers.provider.getBalance(deployer.address)).toString()
  );
  console.log("Network:", networkName);

  const argv = process.argv.slice(2);
  const getArgValue = (flag) => {
    const idx = argv.findIndex((x) => x === flag);
    if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
    const eq = argv.find((x) => x.startsWith(`${flag}=`));
    if (eq) return eq.split("=").slice(1).join("=");
    return undefined;
  };

  const contractName =
    process.env.CONTRACT_NAME || getArgValue("--contract") || getArgValue("--name") || "AvalancheGreeter";

  if (!process.env.CONTRACT_NAME && !getArgValue("--contract") && !getArgValue("--name")) {
    console.log(`No contract specified; defaulting to "${contractName}".`);
  }

  // Only known constructor args we auto-fill by default.
  const greeting = process.env.GREETING || "Hello, Avalanche!";
  const constructorArgsJson = process.env.CONSTRUCTOR_ARGS_JSON || getArgValue("--constructor-args-json");

  let constructorArgs = [];
  if (constructorArgsJson) {
    try {
      constructorArgs = JSON.parse(constructorArgsJson);
    } catch (e) {
      console.error("Failed to parse CONSTRUCTOR_ARGS_JSON:", e);
      process.exit(1);
    }
  } else if (contractName === "AvalancheGreeter") {
    constructorArgs = [greeting];
  }

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  ensureDirSync(deploymentsDir);

  const deployedFilePath = path.join(deploymentsDir, `${networkName}.json`);

  const { chainId } = await hre.ethers.provider.getNetwork();

  let deploymentsFile = null;
  if (fs.existsSync(deployedFilePath)) {
    deploymentsFile = JSON.parse(fs.readFileSync(deployedFilePath, "utf8"));
  }

  const result = deploymentsFile || {
    network: networkName,
    // ethers v6 may return chainId as BigInt; JSON cannot serialize BigInt.
    chainId: chainId != null ? chainId.toString() : undefined,
    deployedAt: new Date().toISOString(),
    contracts: {},
  };

  const ContractFactory = await hre.ethers.getContractFactory(contractName);
  const contract = await ContractFactory.deploy(...constructorArgs);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`${contractName} deployed to:`, address);

  result.contracts = result.contracts || {};
  result.contracts[contractName] = { address, constructorArgs };
  fs.writeFileSync(deployedFilePath, JSON.stringify(result, null, 2), "utf8");
  console.log("Deployment saved to:", deployedFilePath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
