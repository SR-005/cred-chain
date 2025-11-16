// /static/js/credchain.js
// This module dynamically fetches the compiled contract JSON to get the ABI
// — avoids import path/packaging problems with a separate abi JS file.

let web3;
let contract;
let account;

const CONTRACT_ADDRESS = "0xF4F2850761BDdDC14f763299622c49F669945e05";
const COMPILED_JSON_PATH = "./static/compiledcccode.json"; // serve this from your static folder

// ---- helper: load ABI from compiled JSON ----
async function loadAbi() {
    try {
        console.log("[credchain] fetching compiled JSON:", COMPILED_JSON_PATH);
        const resp = await fetch(COMPILED_JSON_PATH);
        if (!resp.ok) throw new Error(`Failed to fetch ABI JSON: ${resp.status}`);
        const compiled = await resp.json();

        // adjust the path depending on how your compiled file is structured
        // this matches your earlier Python: compiledsol["contracts"]["chaincred.sol"]["CredChain"]["abi"]
        const abi = compiled?.contracts?.["chaincred.sol"]?.CredChain?.abi;
        if (!abi) throw new Error("ABI not found at expected path in compiledcccode.json");
        console.log("[credchain] ABI loaded, length:", abi.length);
        return abi;
    } catch (err) {
        console.error("[credchain] loadAbi error:", err);
        throw err;
    }
}

// ---- network switch to Moonbase Alpha (HEX chainId) ----
async function switchToMoonbase() {
    const chainIdHex = "0x507"; // 1287
    if (!window.ethereum) throw new Error("No ethereum provider (MetaMask)");

    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainIdHex }]
        });
        console.log("[credchain] switched to Moonbase Alpha");
    } catch (err) {
        // 4902 -> chain not added
        if (err.code === 4902) {
            try {
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [{
                        chainId: chainIdHex,
                        chainName: "Moonbase Alpha",
                        rpcUrls: ["https://rpc.api.moonbase.moonbeam.network"],
                        nativeCurrency: { name: "DEV", symbol: "DEV", decimals: 18 },
                        blockExplorerUrls: ["https://moonbase.moonscan.io/"]
                    }]
                });
                console.log("[credchain] added Moonbase Alpha");
            } catch (addErr) {
                console.error("[credchain] add chain error:", addErr);
                throw addErr;
            }
        } else {
            console.error("[credchain] switch chain error:", err);
            throw err;
        }
    }
}

// ---- initialize web3 + contract (loads ABI at runtime) ----
async function initContract() {
    if (!window.ethereum) throw new Error("MetaMask not found");
    if (!web3) {
        web3 = new Web3(window.ethereum);
    }

    const abi = await loadAbi();
    contract = new web3.eth.Contract(abi, CONTRACT_ADDRESS);
    console.log("[credchain] contract instance created");
}

//----------------------------------------------------------CONNECT WALLET: WORKS----------------------------------------------------------
export async function connectWallet() {
    if (!window.ethereum) {
        alert("Install MetaMask!");
        throw new Error("No ethereum provider");
    }

    await switchToMoonbase();

    web3 = new Web3(window.ethereum);
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    account = accounts[0];
    console.log("[credchain] wallet connected:", account);

    // ensure contract ready
    await initContract();

    // expose some helpful debugging info to console
    try {
        const chainId = await web3.eth.getChainId();
        console.log("[credchain] chainId:", chainId);
    } catch (e) { /* ignore */ }

    return account;
}


//----------------------------------------------------------SIGNING TRANSACTION: WORKS----------------------------------------------------------
async function sendTx(txObject) {
    if (!account) throw new Error("account not set; call connectWallet() first");
    try {
        const gas = await txObject.estimateGas({ from: account });
        const gasPrice = await web3.eth.getGasPrice();
        console.log("[credchain] sending tx — gas:", gas, "gasPrice:", gasPrice);

        const receipt = await txObject.send({
            from: account,
            gas,
            gasPrice
        });
        console.log("[credchain] tx receipt:", receipt);
        return receipt;
    } catch (err) {
        console.error("[credchain] sendTx error:", err);
        throw err;
    }
}

//----------------------------------------------------------VERIFY USER: WORKS----------------------------------------------------------
export async function verifyUserOnChain() {
    if (!contract || !account) await connectWallet();
    const tx = await sendTx(contract.methods.setUserVerified(account, true));

    return { wallet: account, tx };
}


//----------------------------------------------------------ADD PROJECT AND VERIFY----------------------------------------------------------
export async function addProjectOnChain(client, name, desc, lang, projectHash, link) {
    if (!contract || !account) await connectWallet();

    const p = {
        user: account,
        client,
        projectName: name,
        description: desc,
        languages: lang,
        projectHash,
        link
    };

    console.log("[credchain] addProject struct:", p);
    return sendTx(contract.methods.addProject(p));
}

//----------------------------------------------------------SUBMIT REVIEW----------------------------------------------------------
export async function submitReviewOnChain(freelancer, index, rating, commentHash) {
    if (!contract || !account) await connectWallet();
    return sendTx(contract.methods.submitReview(freelancer, index, rating, commentHash));
}

//----------------------------------------------------------GET PROJECTS: FREELANCER----------------------------------------------------------
export async function getAllProjectsFromChain(builder) {
    if (!contract) await initContract();

    try {
        builder = web3.utils.toChecksumAddress(builder);

        // Get total project count
        const count = await contract.methods.getProjectCount(builder).call();
        console.log("Project count:", count);

        let projects = [];

        for (let i = 0; i < count; i++) {
            const p = await contract.methods.getProject(builder, i).call();


            projects.push({
                client: p[0],
                projectName: p[1],
                description: p[2],
                languages: p[3],
                projectHash: p[4],
                link: p[5],
                verified: p[6]
            });
        }

        return projects; // return only array, not wrapped
    } catch (err) {
        console.error("getAllProjectsFromChain ERROR:", err);
        return [];
    }
}

//-----------------------------------------------------------GET PROJECTS+REVIEW: CLIENT-----------------------------------------------------------
async function loadBuildersJson() {
    try {
        const res = await fetch("/builders.json");   // NOW WORKS
        if (!res.ok) throw new Error("builders.json not found");
        const data = await res.json();
        return Array.isArray(data) ? data : (data.builders || []);
    } catch (err) {
        console.error("Failed to load builders.json:", err);
        return [];
    }
}

export async function getProjectsForClient(wallet) {
    if (!contract) await initContract();

    wallet = web3.utils.toChecksumAddress(account);

    let projects = [];
    const builders = await loadBuildersJson();
    console.log("Loaded builders:", builders);

    // IMPORTANT: You MUST have a list of all known builders
    for (const builder of builders) {
        
        const builderChecksum = web3.utils.toChecksumAddress(builder);

        const count = await contract.methods.getProjectCount(builderChecksum).call();

        for (let i = 0; i < count; i++) {
            const p = await contract.methods.getProject(builderChecksum, i).call();

            // Solidity struct returns object-form:
            // p.client, p.projectName, p.description, etc.

            if (web3.utils.toChecksumAddress(p.client) === wallet) {
                projects.push({
                    freelancer: builderChecksum,
                    projectName: p.projectName,
                    description: p.description,
                    languages: p.languages,
                    projectHash: p.projectHash,
                    link: p.link,
                    verified: p.verified,
                    timestamp: Number(p.timestamp),
                    index: i
                });
            }
        }
    }

    return projects;
}

export async function getProjectReviewsFromChain(builder, index) {
    if (!contract) await initContract();

    try {
        builder = web3.utils.toChecksumAddress(builder);

        const reviews = await contract.methods
            .getProjectReviews(builder, index)
            .call();

        return reviews.map(r => ({
            reviewer: r.reviewer,
            projectIndex: r.projectIndex,
            rating: r.rating,
            commentHash: r.commentHash
        }));

    } catch (err) {
        console.error("getProjectReviewsFromChain ERROR:", err);
        return [];
    }
}


window.connectWallet = connectWallet;
window.verifyUserOnChain = verifyUserOnChain;
window.addProjectOnChain = addProjectOnChain;
window.submitReviewOnChain = submitReviewOnChain;
window.getAllProjectsFromChain = getAllProjectsFromChain;
window.getProjectsForClient = getProjectsForClient;
window.getProjectReviewsFromChain = getProjectReviewsFromChain;
window.cc_account = () => account;

console.log("[credchain] module loaded");
