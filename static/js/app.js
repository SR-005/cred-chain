// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {

    let account;
    const connectButton = document.getElementById('connect');
    const addrDisplay = document.getElementById('addr');
    const verifyButton = document.getElementById('verify');
    const profileInput = document.getElementById('profile');
    const submitButton = document.getElementById('submit');
    const projectInput = document.getElementById('proj');

    if (connectButton) {
        connectButton.onclick = async () => {
            if (window.ethereum) {
                try {
                    const accs = await ethereum.request({ method: 'eth_requestAccounts' });
                    account = accs[0];
                    
                    // Display connected address
                    const shortAddr = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
                    addrDisplay.innerText = 'Connected: ' + shortAddr;
                    addrDisplay.classList.remove('hidden'); // Show the address display
                    
                    // Update button text
                    connectButton.innerText = 'Connected';
                    connectButton.disabled = true;

                } catch (error) {
                    console.error("User denied account access", error);
                    alert('You must connect your wallet to continue.');
                }
            } else {
                alert('Please install MetaMask to use this dApp.');
            }
        };
    }

    if (verifyButton) {
        verifyButton.onclick = async () => {
            if (!account) return alert('Please connect your wallet first');
            
            const profile = profileInput.value;
            if (!profile) return alert('Please enter a profile link');
            
            try {
                const res = await fetch('http://localhost:5000/verify_user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wallet: account, profile_link: profile })
                });
                const data = await res.json();
                alert('Verification response: ' + JSON.stringify(data));
            } catch (error) {
                console.error('Verification error:', error);
                alert('Error during verification. Check console for details.');
            }
        };
    }

    if (submitButton) {
        submitButton.onclick = async () => {
            if (!account) return alert('Please connect your wallet first');
            
            const link = projectInput.value;
            if (!link) return alert('Please enter a project link');

            try {
                const res = await fetch('http://localhost:5000/submit_project', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wallet: account, link })
                });
                const data = await res.json();
                alert('Project submission response: ' + JSON.stringify(data));
            } catch (error) {
                console.error('Submission error:', error);
                alert('Error during submission. Check console for details.');
            }
        };
    }
});