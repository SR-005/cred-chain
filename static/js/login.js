document.addEventListener('DOMContentLoaded', () => {
    // Select all the elements we need
    const roleRadios = document.querySelectorAll('input[name="role"]');
    const employerForm = document.getElementById('employerForm');
    
    // Updated selectors for the new freelancer structure
    const freelancerSection = document.getElementById('freelancerSection'); // The new wrapper
    const freelancerForm = document.getElementById('freelancerForm');     // The div with just the form fields
    
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const loginForm = document.getElementById('loginForm');

    // New selectors for GitHub Verification
    const verifyBtn = document.getElementById('verifyBtn');
    const profileLinkInput = document.getElementById('profileLink');

    /**
     * Get all required input fields for a given form section.
     */
    function getRequiredInputs(formSection) {
        return formSection.querySelectorAll('input[required], select[required], textarea[required]');
    }

    /**
     * Check if all required fields are filled for the active form.
     */
    function checkFormValidity() {
        let currentFormInputs;
        
        // Check which form is active by seeing which one is NOT hidden
        if (!employerForm.classList.contains('hidden')) {
            // Employer form is active
            currentFormInputs = getRequiredInputs(employerForm);
        } else {
            // Freelancer form is active
            currentFormInputs = getRequiredInputs(freelancerForm);
        }

        let allFieldsFilled = true;
        currentFormInputs.forEach(input => {
            if (input.value.trim() === '' || (input.type === 'email' && !input.checkValidity())) {
                allFieldsFilled = false;
            }
        });
        
        // Enable/disable the Connect Wallet button
        connectWalletBtn.disabled = !allFieldsFilled;
    }

    /**
     * Event listener for role selection.
     */
    roleRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            if (event.target.value === 'employer') {
                employerForm.classList.remove('hidden');
                freelancerSection.classList.add('hidden'); // Hide the entire freelancer section
            } else {
                freelancerSection.classList.remove('hidden'); // Show the entire freelancer section
                employerForm.classList.add('hidden');
            }
            // Re-check validity when form switches
            checkFormValidity();
        });
    });

    // Add event listeners to all input fields for real-time validation
    loginForm.addEventListener('input', checkFormValidity);

    // Initial check on page load (for the default selected role)
    checkFormValidity();

    /**
     * Event listener for Connect Wallet button.
     */
    connectWalletBtn.addEventListener('click', () => {
        alert('Connecting wallet...');
        // Wallet connection logic would go here
    });

    /**
     * Event listener for the final Login button (form submission).
     */
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission

        if (!connectWalletBtn.disabled) { 
             const formData = new FormData(loginForm);
             const data = Object.fromEntries(formData.entries());
             alert('Login Attempt with Data: \n' + JSON.stringify(data, null, 2));
             // fetch('/login', { method: 'POST', ... })
        } else {
            alert('Please fill all required fields and connect your wallet first!');
        }
    });

    /**
     * --- NEWLY ADDED (from your request) ---
     * Event listener for the GitHub Verify button.
     */
    if (verifyBtn) {
        verifyBtn.addEventListener('click', function() {
            const input = profileLinkInput.value;
            
            if(input && input.trim() !== "") {
                // In a real app, you would send this to your Flask backend
                // fetch('/verify-github', { method: 'POST', ... })
                alert(`Verifying GitHub profile: ${input}`);
            } else {
                alert("Please enter a GitHub URL first.");
                profileLinkInput.focus(); // Put the user's cursor back in the input
            }
        });
    }

});