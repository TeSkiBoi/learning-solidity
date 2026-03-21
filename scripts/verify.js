const fs = require("fs");
const path = require("path");

const hre = require("hardhat");

async function main() {
  const networkName = hre.network.name;
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const deployedFilePath = path.join(deploymentsDir, `${networkName}.json`);

  const argv = process.argv.slice(2);
  const getArgValue = (flag) => {
    const idx = argv.findIndex((x) => x === flag);
    if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
    const eq = argv.find((x) => x.startsWith(`${flag}=`));
    if (eq) return eq.split("=").slice(1).join("=");
    return undefined;
  };

  const contractName = process.env.CONTRACT_NAME || getArgValue("--contract");

  // Optional: verify a specific address directly.
  const contractAddress = process.env.CONTRACT_ADDRESS || getArgValue("--address");

  if (contractAddress && !contractName) {
    // Best effort: locate constructor args in deployments file by address.
    if (!fs.existsSync(deployedFilePath)) {
      console.error(
        `Missing deployments file: ${deployedFilePath}\n` +
          "Run deploy first or set CONTRACT_NAME so we know constructor args."
      );
      process.exit(1);
    }
    const deployment = JSON.parse(fs.readFileSync(deployedFilePath, "utf8"));
    const contracts = deployment.contracts || {};

    for (const [name, info] of Object.entries(contracts)) {
      if (info && info.address && info.address.toLowerCase() === contractAddress.toLowerCase()) {
        console.log(`Verifying ${name}:`, contractAddress);
        await hre.run("verify:verify", {
          address: info.address,
          constructorArguments: info.constructorArgs || [],
        });
        return;
      }
    }

    console.error(
      "Contract address not found in deployments file.\n" +
        "Set CONTRACT_NAME or run deploy so the constructor args are saved."
    );
    process.exit(1);
  }

  if (contractAddress && contractName) {
    // Backwards compatible convenience:
    // - AvalancheGreeter can be verified without relying on deployments json.
    if (contractName === "AvalancheGreeter") {
      const greeting = process.env.GREETING || "Hello, Avalanche!";
      console.log("Verifying AvalancheGreeter:", contractAddress);
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [greeting],
      });
      return;
    }

    // Other contracts: constructor args from CONSTRUCTOR_ARGS_JSON, deployments file, or [] (no-arg deploys).
    const constructorArgsJson =
      process.env.CONSTRUCTOR_ARGS_JSON || getArgValue("--constructor-args-json");
    let constructorArgs = [];
    if (constructorArgsJson) {
      try {
        constructorArgs = JSON.parse(constructorArgsJson);
      } catch (e) {
        console.error("Failed to parse CONSTRUCTOR_ARGS_JSON:", e);
        process.exit(1);
      }
    } else if (fs.existsSync(deployedFilePath)) {
      const deployment = JSON.parse(fs.readFileSync(deployedFilePath, "utf8"));
      const info = (deployment.contracts || {})[contractName];
      if (info && Array.isArray(info.constructorArgs)) {
        constructorArgs = info.constructorArgs;
      }
    }

    console.log(`Verifying ${contractName}:`, contractAddress);
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
    });
    return;
  }

  if (!fs.existsSync(deployedFilePath)) {
    console.error(
      `Missing deployments file: ${deployedFilePath}\n` +
        "1) Deploy first, then verify (creates this file):\n" +
        "   export CONTRACT_NAME=Intro && pnpm run deploy:fuji\n" +
        "2) Or verify by address (no file needed for no-arg contracts):\n" +
        "   export CONTRACT_NAME=Intro CONTRACT_ADDRESS=0x... && pnpm run verify:fuji\n"
    );
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deployedFilePath, "utf8"));

  const contracts = deployment.contracts || {};
  const entries = Object.entries(contracts);
  if (entries.length === 0) {
    console.error("No contracts found in deployment file.");
    process.exit(1);
  }

  const toVerify = contractName
    ? entries.filter(([name]) => name === contractName)
    : entries;

  if (toVerify.length === 0) {
    console.error(
      `No deployment found for contract "${contractName}".\n` +
        "Deploy it first (so we can store constructor args), then run verify again."
    );
    process.exit(1);
  }

  console.log(`Verifying ${toVerify.length} contract(s) on network: ${networkName}`);

  for (const [name, info] of toVerify) {
    console.log(`- ${name}: ${info.address}`);
    await hre.run("verify:verify", {
      address: info.address,
      constructorArguments: info.constructorArgs || [],
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
