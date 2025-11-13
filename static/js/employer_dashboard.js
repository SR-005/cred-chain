document.addEventListener('DOMContentLoaded', () => {
    
    // Assume we have the employer's account address (e.g., from a connected wallet)
    // For this example, we'll use a placeholder.
    const account = "0xEmployerWalletAddress...123";

    // Load all dashboard data when the page is ready
    loadEmployerProfile(account);
    loadEmployerStats(account);
    loadEmployerJobs(account);
});

/**
 * Fetches and populates the main employer profile card.
 */
async function loadEmployerProfile(account) {
    // --- MOCK DATA (replace with API call) ---
    // const response = await fetch(`/api/get_employer_profile/${account}`);
    // const data = await response.json();
    const data = {
        employerName: "Acme Inc. Hiring",
        companyName: "Acme Corporation",
        preferredStack: "MERN Stack",
        linkedin: "linkedin.com/company/acme",
        wallet: account
    };
    // ------------------------------------

    const nameElement = document.getElementById('employer-name');
    const companyElement = document.getElementById('company-name');
    const stackElement = document.getElementById('employer-stack');
    const linkedinElement = document.getElementById('employer-linkedin');
    const walletElement = document.getElementById('employer-wallet');
    const avatarElement = document.getElementById('employer-avatar-initials');

    if (data) {
        nameElement.textContent = data.employerName || "Unnamed";
        companyElement.textContent = data.companyName || "No company listed";
        stackElement.textContent = `Prefers: ${data.preferredStack || "Any"}`;
        linkedinElement.textContent = data.linkedin || "Not provided";
        walletElement.textContent = data.wallet || "No wallet";
        
        // Create avatar initials from the employer name
        if (data.employerName) {
            const initials = data.employerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            avatarElement.textContent = initials;
        } else {
            avatarElement.textContent = "🏢"; // Default company icon
        }
    }
}

/**
 * Fetches and populates the quick stats boxes.
 */
async function loadEmployerStats(account) {
    // --- MOCK DATA (replace with API call) ---
    const data = {
        activeJobs: 3,
        proposalsReceived: 27,
        totalHires: 12
    };
    // ------------------------------------

    document.getElementById('stats-active-jobs').textContent = data.activeJobs;
    document.getElementById('stats-proposals').textContent = data.proposalsReceived;
    document.getElementById('stats-total-hires').textContent = data.totalHires;
}

/**
 * Fetches and renders the list of posted jobs.
 */
async function loadEmployerJobs(account) {
    const listElement = document.getElementById('jobs-list');
    listElement.innerHTML = ""; // Clear the "Loading..." text

    // --- MOCK DATA (replace with API call) ---
    const jobs = [
        {
            title: "Senior Solidity Developer",
            status: "Active",
            description: "Looking for an experienced Solidity dev to audit and optimize our staking contracts.",
            proposals: 5,
        },
        {
            title: "Frontend Developer (React)",
            status: "Closed",
            description: "Build and maintain our new user-facing dashboard.",
            proposals: 22,
        }
    ];
    // ------------------------------------

    if (jobs.length === 0) {
        listElement.innerHTML = "<p class='text-light-muted'>You haven't posted any jobs yet.</p>";
        return;
    }

    jobs.forEach(job => {
        const jobCardHTML = createJobCardHTML(job);
        listElement.insertAdjacentHTML('beforeend', jobCardHTML);
    });
}

/**
 * Helper function to generate the HTML for a single job card.
 */
function createJobCardHTML(job) {
    const isActive = job.status === 'Active';
    const statusColor = isActive ? 'text-green-400 bg-green-900/50' : 'text-gray-400 bg-gray-700';
    const statusIcon = isActive ? '<ion-icon name="sync-outline" class="align-middle animate-spin mr-1"></ion-icon>' : '';
    const cardOpacity = isActive ? '' : 'opacity-70';

    return `
    <div class="bg-primary-dark border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition duration-300 ${cardOpacity}">
        <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
            <h4 class="text-xl font-bold text-white mb-2 sm:mb-0">${job.title}</h4>
            <span class="text-xs font-semibold ${statusColor} px-3 py-1 rounded-full w-fit">
                ${statusIcon}
                ${job.status}
            </span>
        </div>
        <p class="text-light-muted text-sm mt-2 mb-4">${job.description}</p>
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <span class="text-light font-semibold">
                ${job.proposals} Proposals Received
            </span>
            <div class="flex space-x-2">
                <button class="p-2 rounded-lg bg-blue-600/50 text-blue-300 hover:bg-blue-600 hover:text-white transition duration-200" title="View Proposals">
                    <ion-icon name="eye-outline" class="text-lg"></ion-icon>
                </button>
                <button class="p-2 rounded-lg bg-gray-600/50 text-gray-300 hover:bg-gray-600 hover:text-white transition duration-200" title="Edit Job">
                    <ion-icon name="create-outline" class="text-lg"></ion-icon>
                </button>
                <button class="p-2 rounded-lg bg-red-600/50 text-red-300 hover:bg-red-600 hover:text-white transition duration-200" title="Close Job">
                    <ion-icon name="trash-outline" class="text-lg"></ion-icon>
                </button>
            </div>
        </div>
    </div>
    `;
}