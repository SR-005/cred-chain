import requests
import os
import json
import hashlib
from dotenv import load_dotenv
from pathlib import Path
from flask import Flask,jsonify,render_template,request
from flask_cors import CORS
from web3 import Web3
from deploy import depoly_contract

load_dotenv()
MYADDRESS = Web3.to_checksum_address(os.getenv("METAMASK"))
SECRETCODE = os.getenv("SECRETKEY")

w3 = Web3(Web3.HTTPProvider("https://rpc.api.moonbase.moonbeam.network"))
chainid=1287

app = Flask(__name__)
CORS(app) 

@app.route('/')
def home():
    return render_template('home.html')

def deploysmartcontract():                                  #deployment function call
    '''contractaddress,abi=depoly_contract() '''              
    global contract

    with open("./compiledcccode.json","r") as file:
        compiledsol = json.load(file) 
    abi=compiledsol["contracts"]["chaincred.sol"]["CredChain"]["abi"]
    contract=w3.eth.contract(address="0xc57D3E68b3Ea6C0b7C9E2118EC1F9C1EA988b1A5", abi=abi)
    
    '''global contract
    contract='0x7B87314c1975ba20ff93b931f3aEA7779098fA13'   '''

# In-memory pending list for demo
PENDING_PROJECTS = []  # {user, link, hash, index}

#-----------------------------------------------------------CALL FUNCTIONS-----------------------------------------------------------
def callfeature(feature):
    print("Call Recieved!!")
    balance = w3.eth.get_balance(MYADDRESS)
    print("Balance:", w3.from_wei(balance, "ether"), "DEV")

    
    #fetching nonce(latest transaction) of our wallet
    nonce=w3.eth.get_transaction_count(MYADDRESS,"pending")

    feature_transaction=feature.build_transaction(       #call function by building a transaction
        {"chainId":chainid,
        "from": MYADDRESS,
        "nonce":nonce,
        "gas": 7000000,
        "gasPrice": w3.to_wei("20", "gwei")}
    )
    
    signedfeature_transaction=w3.eth.account.sign_transaction(feature_transaction,private_key=SECRETCODE)  #sign that transaction
    feature_transactionhash=w3.eth.send_raw_transaction(signedfeature_transaction.raw_transaction)    #generate transcation hash
    print("Transcation hash:", feature_transactionhash.hex())

    feature_transactionreceipt=w3.eth.wait_for_transaction_receipt(feature_transactionhash)   #fetch the transaction receipt
    return feature_transactionreceipt


def owner_account():
    return w3.eth.account.from_key(SECRETCODE)

#-----------------------------------------------------------VERIFY USER-----------------------------------------------------------
@app.route("/verify_user", methods=["POST"])
def verify_user():
    print("Button Clicked")
    """
    Request JSON:
    { "wallet": "0x..", "profile_link": "https://github.com/..." }
    """
    data = request.get_json()
    wallet = data.get("wallet")
    print(wallet)
    link = data.get("profile_link")
    print(link)
    deploysmartcontract()
    if not wallet or not link:
        return jsonify({"error": "wallet and profile_link required"}), 400

    # Quick validation: link reachable (simple MVP)
    try:
        r = requests.get(link, timeout=8)
        if r.status_code != 200:
            return jsonify({"verified": False, "reason": "profile link unreachable"}), 400
    except Exception as e:
        return jsonify({"verified": False, "reason": str(e)}), 400

    # mark verified on-chain
    try:
        setverified = contract.functions.setUserVerified(MYADDRESS, True)
        receipt = callfeature(setverified)
        print("Github user verification: ",receipt)
        return jsonify({"verified": True, "tx": receipt.transactionHash.hex()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

#-----------------------------------------------------------VERIFY PROJECT-----------------------------------------------------------
@app.route("/submit_project", methods=["POST"])
def submit_project():
    """
    JSON:
    { "wallet":"0x..", "link":"https://raw.githubusercontent.com/.. or https://github.com/.. "}
    """
    data = request.get_json()
    wallet = data.get("wallet")
    link = data.get("link")
    deploysmartcontract()
    if not wallet or not link:
        return jsonify({"error":"wallet and link required"}), 400

    # Fetch content (for repo, fetching raw or zip is tricky; simple GET for demo)
    try:
        r = requests.get(link, timeout=12)
        if r.status_code != 200:
            return jsonify({"error":"provided link not reachable"}), 400
        content = r.content
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    # Compute SHA-256 hex
    h = hashlib.sha256(content).hexdigest()

    # Call addProject
    try:
        feature = contract.functions.addProject(MYADDRESS, h, link)
        receipt = callfeature(feature)
        print("Github user verification: ",receipt)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Determine index (getProjectCount returns number of projects)
    try:
        count = contract.functions.getProjectCount(Web3.toChecksumAddress(wallet)).call()
        index = count - 1
    except Exception:
        index = None

    PENDING_PROJECTS.append({"user": wallet, "link": link, "hash": h, "index": index})
    return jsonify({"status":"added", "tx": receipt.transactionHash.hex(), "index": index})


if __name__=="__main__":
    app.run(debug=True)