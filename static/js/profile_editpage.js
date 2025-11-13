// This script runs when the profile.html page is loaded.
// We wrap everything in DOMContentLoaded to ensure the HTML elements exist before we attach listeners.
document.addEventListener('DOMContentLoaded', () => {

    const saveProfileBtn = document.getElementById('saveProfile');
    const verifyBtn = document.getElementById('verify');
    const profileLinkInput = document.getElementById('profileLink');

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', function() {
            const btn = this;
            const originalText = btn.innerText;
            btn.innerText = "Saving...";
            
            // Disable the button to prevent multiple clicks
            btn.disabled = true; 
            btn.classList.add('opacity-75', 'cursor-not-allowed');
            
            // Simulate an API call delay (like saving to the database)
            setTimeout(() => {
                btn.innerText = "Saved!";
                btn.classList.remove('bg-blue-600', 'hover:bg-blue-500');
                btn.classList.add('bg-green-600', 'hover:bg-green-500');
                
                // Show a confirmation to the user
                // In a real app, you'd handle success/error from your Flask backend
                alert("Profile saved locally! (Connect Flask backend to persist)");

                // Revert button back to normal after 2 seconds
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.disabled = false; // Re-enable the button
                    btn.classList.remove('bg-green-600', 'hover:bg-green-500', 'opacity-75', 'cursor-not-allowed');
                    btn.classList.add('bg-blue-600', 'hover:bg-blue-500');
                }, 2000);

            }, 1000);
        });
    }

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

    // Add any other profile page logic here
    
});