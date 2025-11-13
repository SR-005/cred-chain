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
from routes import routes 

load_dotenv()
MYADDRESS = Web3.to_checksum_address(os.getenv("METAMASK"))
SECRETCODE = os.getenv("SECRETKEY")

w3 = Web3(Web3.HTTPProvider("https://rpc.api.moonbase.moonbeam.network"))
chainid=1287

app = Flask(__name__)
CORS(app) 
app.register_blueprint(routes) 


'''@app.route('/')
def home():
    return render_template('home.html')'''

@app.route('/')
def user():
    return render_template('index.html')

@app.route('/client')
def clientpage():
    return render_template('client.html')

#-----------------------------------------------------------JSON FILES-----------------------------------------------------------
BUILDERS_FILE = "builders.json"
def load_builders():
    global KNOWN_BUILDERS
    if os.path.exists(BUILDERS_FILE):
        with open(BUILDERS_FILE, "r") as f:
            KNOWN_BUILDERS = set(json.load(f))
    else:
        KNOWN_BUILDERS = set()

def save_builders():
    with open(BUILDERS_FILE, "w") as f:
        json.dump(list(KNOWN_BUILDERS), f)
load_builders()


PENDING_FILE = "pending.json"
def load_pending():
    global PENDING_PROJECTS
    if os.path.exists(PENDING_FILE):
        with open(PENDING_FILE, "r") as f:
            PENDING_PROJECTS = json.load(f)
    else:
        PENDING_PROJECTS = []

def save_pending():
    with open(PENDING_FILE, "w") as f:
        json.dump(PENDING_PROJECTS, f, indent=2)

PROFILES_FILE = "profiles.json"
# Load or initialize profiles
def load_profiles():
    global PROFILES
    if os.path.exists(PROFILES_FILE):
        with open(PROFILES_FILE, "r") as f:
            PROFILES = json.load(f)
    else:
        PROFILES = {}

def save_profiles():
    with open(PROFILES_FILE, "w") as f:
        json.dump(PROFILES, f, indent=2)

load_profiles()

#-----------------------------------------------------------SMART CONTRACT DEPLOYMENT-----------------------------------------------------------
def deploysmartcontract():                                  #deployment function call
    print("Contract Deployment Function Triggered")
    contractaddress,abi=depoly_contract()  
    global contract

    with open("./static/compiledcccode.json","r") as file:
        compiledsol = json.load(file) 
    abi=compiledsol["contracts"]["chaincred.sol"]["CredChain"]["abi"]

    with open("static\js\credchain_abi.js", "w") as out:
        out.write("const CONTRACT_ABI = ")
        out.write(json.dumps(abi))
        out.write(";")

    contract=w3.eth.contract(address=contractaddress, abi=abi)
    

def getsmartcontract():                                  #deployment function call
    print("Getting Contract Address")  
    
    with open("./static/compiledcccode.json","r") as file:
        compiledsol = json.load(file) 
    abi=compiledsol["contracts"]["chaincred.sol"]["CredChain"]["abi"]

    with open("static\js\credchain_abi.js", "w") as out:
        out.write("const CONTRACT_ABI = ")
        out.write(json.dumps(abi))
        out.write(";")

    global contract
    contract=w3.eth.contract(address="0xeDf137bA1DbB1Bb3c03fc81bDDafb59C78B94422", abi=abi)

#-----------------------------------------------------------CALL FUNCTIONS-----------------------------------------------------------
def callfeature(feature):
    print("Function Call Recieved!!")
    balance = w3.eth.get_balance("wallet")
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

#-----------------------------------------------------------VERIFY USER: WORKS-----------------------------------------------------------
@app.route("/verifyuser", methods=["POST"])
def verifyuser():
    data = request.get_json() or {}

    wallet = data.get("wallet")
    link = data.get("profile_link")

    #conditions
    if not wallet:
        return jsonify({"valid": False, "reason": "Wallet missing"}), 400
    if not link:
        return jsonify({"valid": False, "reason": "Profile link missing"}), 400
    if not ("github.com" in link or "linkedin.com" in link):
        return jsonify({"valid": False, "reason": "Not a valid link"}), 400

    try:
        r = requests.get(link, timeout=10, headers={"User-Agent": "CredChainVerifier/1.0"})
        if r.status_code == 404:
            return jsonify({"valid": False, "reason": "GitHub page not found"}), 400

    except Exception as e:
        return jsonify({"valid": False, "reason": f"Request failed: {str(e)}"}), 400

    # Save GitHub link
    load_profiles()
    w = wallet.lower()
    if w not in PROFILES:
        PROFILES[w] = {}
    PROFILES[w]["github"] = link
    save_profiles()

    print("Github Link Verified by Backend")
    return jsonify({"valid": True})

#-----------------------------------------------------------PROJECT HASHING: WORKS-----------------------------------------------------------
@app.route("/hash_project", methods=["POST"])
def hash_project():
    data = request.get_json()
    link=data.get("link")

    # Normalize GitHub link
    if "github.com" in link and "raw.githubusercontent.com" not in link:
        link = link.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")

    # Fetch content & hash
    try:
        r = requests.get(link, timeout=12)
        if r.status_code != 200:
            return jsonify({"error": "provided link not reachable"}), 400
        content = r.content
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    h = hashlib.sha256(content).hexdigest()
    print("Hash of the Project: ",h)
    return jsonify({"hash": h})

#-----------------------------------------------------------ADD PROJECT: CHECK-----------------------------------------------------------
@app.route("/submit_project", methods=["POST"])
def submit_project():
    """Adds a project to the blockchain. Auto-verification is handled inside the smart contract."""
    print("Submit Project Function Triggered")
    data = request.get_json()
    wallet = data.get("wallet")
    client = data.get("client")
    link = data.get("link")
    name = data.get("name")
    description = data.get("description")
    languages = data.get("languages")

    if not wallet or not link or not client:
        return jsonify({"error": "wallet, client, and link required"}), 400


    # Normalize GitHub link
    if "github.com" in link and "raw.githubusercontent.com" not in link:
        link = link.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")

    # Fetch content & hash
    try:
        r = requests.get(link, timeout=12)
        if r.status_code != 200:
            return jsonify({"error": "provided link not reachable"}), 400
        content = r.content
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    h = hashlib.sha256(content).hexdigest()

    # Call addProject (auto-verifies inside contract)
    try:
        feature = contract.functions.addProject((
        Web3.to_checksum_address(wallet),   # p.user
        Web3.to_checksum_address(client),   # p.client
        name,
        description,
        languages,
        h,
        link
    ))


        receipt = callfeature(feature)
        print("Project added + verified automatically:", receipt)
    except Exception as e:
        return jsonify({"error": f"addProject failed: {str(e)}"}), 500

    # Track builder for dashboard use
    KNOWN_BUILDERS.add(wallet)
    save_builders()

    try:
        count = contract.functions.getProjectCount(Web3.to_checksum_address(wallet)).call()
        index = count - 1
    except Exception:
        index = None

    return jsonify({
        "status": "added_and_verified",
        "tx": receipt.transactionHash.hex(),
        "index": index
    })

# ----------------------------------------------------------- GET ALL PROJECTS (BUILDER) -----------------------------------------------------------
@app.route("/get_all_projects/<builder>", methods=["GET"])      #from freelancer side
def get_all_projects(builder):
    getsmartcontract()
    try:
        builder = Web3.to_checksum_address(builder)
        count = contract.functions.getProjectCount(builder).call()
        print(count)

        count = contract.functions.getProjectCount(builder).call()
        projects = []

        for i in range(count):
            p = contract.functions.getProject(builder, i).call()

            # p MUST have 8 elements (0–7)
            if len(p) != 8:
                print("ERROR: Unexpected project struct length:", p)
                continue

            projects.append({
                "client": p[0],
                "projectName": p[1],
                "description": p[2],
                "languages": p[3],
                "projectHash": p[4],
                "link": p[5],
                "verified": p[6],
                "timestamp": p[7]
            })

        return jsonify({"builder": builder, "projects": projects})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


#-----------------------------------------------------------CLIENT PROJECTS-----------------------------------------------------------
@app.route("/get_projects_for_client/<wallet>")
def get_projects_for_client(wallet):
    projects = []
    getsmartcontract()
    
    for builder in KNOWN_BUILDERS:  
        count = contract.functions.getProjectCount(Web3.to_checksum_address(builder)).call()
        for i in range(count):
            p = contract.functions.getProject(Web3.to_checksum_address(builder), i).call()
            if Web3.to_checksum_address(p[0]) == Web3.to_checksum_address(wallet):  # client matches
                projects.append({
                "freelancer": builder,
                "projectName": p[1],
                "description": p[2],
                "languages": p[3],
                "projectHash": p[4],
                "link": p[5],
                "verified": p[6],
                "timestamp": p[7]
            })
    return jsonify(projects)


#-----------------------------------------------------------REVIEW-----------------------------------------------------------
@app.route("/submit_review", methods=["POST"])
def submit_review():
    data = request.get_json()
    freelancer = data.get("freelancer")
    project_index = int(data.get("project_index"))
    rating = int(data.get("rating"))
    comment_hash = data.get("comment_hash")  # optional IPFS comment link


    fn = contract.functions.submitReview(
        Web3.to_checksum_address(freelancer),
        project_index,
        rating,
        comment_hash
    )
    receipt = callfeature(fn)
    return jsonify({"tx": receipt.transactionHash.hex()})




#-----------------------------------------------------------GET PROJECT WITH REVIEWS-----------------------------------------------------------
@app.route("/get_project_with_reviews", methods=["GET"])
def get_project_with_reviews():
    builder = request.args.get("builder")
    index = request.args.get("index", type=int)

    if not builder or index is None:
        return jsonify({"error": "builder and index required"}), 400

    try:
        # Fetch full project details with all fields
        result = contract.functions.getProjectWithReviews(
            Web3.to_checksum_address(builder),
            index
        ).call()

        client = result[0]
        projectHash = result[1]
        link = result[2]
        verified = result[3]
        reviews_raw = result[4]

        # Format reviews
        reviews = [
            {
                "reviewer": r[0],
                "projectIndex": r[1],
                "rating": r[2],
                "commentHash": r[3]
            }
            for r in reviews_raw
        ]

        return jsonify({
            "builder": builder,
            "index": index,
            "client": client,
            "projectHash": projectHash,
            "link": link,
            "verified": verified,
            "reviews": reviews
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ----------------------------------------------------------- GET ALL REVIEWS (BUILDER) -----------------------------------------------------------
@app.route("/get_all_reviews/<builder>", methods=["GET"])
def get_all_reviews(builder):
    """Fetch all reviews received by a specific freelancer."""
    try:
        result = contract.functions.getAllReviews(Web3.to_checksum_address(builder)).call()

        # Format reviews for readability
        formatted_reviews = [
            {
                "reviewer": r[0],
                "projectIndex": r[1],
                "rating": r[2],
                "commentHash": r[3]
            }
            for r in result
        ]

        return jsonify({
            "builder": builder,
            "reviewCount": len(formatted_reviews),
            "reviews": formatted_reviews
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

# ---------------- Create or Update Freelancer Profile ----------------
@app.route("/create_profile", methods=["POST"])
def create_profile():
    """
    Request JSON Example:
    {
        "wallet": "0xFreelancerWallet",
        "name": "John Doe",
        "bio": "Blockchain developer and data scientist.",
        "skills": ["Solidity", "Python", "Flask"],
        "github": "https://github.com/johndoe",
        "linkedin": "https://linkedin.com/in/johndoe",
        "profile_pic": "ipfs://QmHash..."
    }
    """
    data = request.get_json()
    wallet = data.get("wallet")

    if not wallet:
        return jsonify({"error": "wallet required"}), 400

    # Normalize wallet (lowercase for key consistency)
    wallet = wallet.lower()

    # Update or create
    PROFILES[wallet] = {
        "name": data.get("name", ""),
        "bio": data.get("bio", ""),
        "skills": data.get("skills", []),
        "github": PROFILES[wallet].get("github", ""),
        "linkedin": data.get("linkedin", ""),
        "email": data.get("email", ""),
        "phone": data.get("phone", "")
    }

    save_profiles()
    return jsonify({"status": "Profile saved", "wallet": wallet})

# ---------------- Get Freelancer Profile ----------------
@app.route("/get_profile/<wallet>", methods=["GET"])
def get_profile(wallet):
    wallet = wallet.lower()
    load_profiles()

    if wallet not in PROFILES:
        return jsonify({"error": "Profile not found"}), 404

    return jsonify(PROFILES[wallet])

if __name__=="__main__":
    app.run(debug=True)