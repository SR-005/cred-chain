// This script runs when the dashboard.html page is loaded.

// NOTE: 'account' must be defined globally, e.g., by a wallet connection script
// loaded in main.html. We'll use a placeholder for this example.
// In a real app, you would get this from your wallet connection logic.
const account = "0x123...abc"; // <-- REPLACE THIS with your dynamic account variable

document.addEventListener('DOMContentLoaded', () => {
    // Load the profile and projects as soon as the page loads
    loadDashboardData();
});

/**
 * Fetches profile and project data from the backend and populates the dashboard.
 */
async function loadDashboardData() {
    // Target all the elements we need to fill
    const avatarInitialsEl = document.getElementById('profile-avatar-initials');
    const nameEl = document.getElementById('profile-name');
    const bioEl = document.getElementById('profile-bio');
    const emailEl = document.getElementById('profile-email');
    const phoneEl = document.getElementById('profile-phone');
    const skillsListEl = document.getElementById('profile-skills-list');
    const projectsListEl = document.getElementById('projects-list');

    try {
        // --- 1. Load Profile ---
        // We assume 'account' is a globally available variable
        if (typeof account === 'undefined' || !account) {
            throw new Error("User account is not defined.");
        }
        
        const profileResponse = await fetch(`http://localhost:5000/get_profile/${account}`);
        if (!profileResponse.ok) {
            throw new Error(`HTTP error! status: ${profileResponse.status}`);
        }
        const pdata = await profileResponse.json();

        // Populate Profile Card
        const initials = pdata.name ? pdata.name.split(' ').map(n => n[0]).join('') : '--';
        avatarInitialsEl.innerText = initials.substring(0, 2).toUpperCase();
        
        nameEl.innerText = pdata.name || "Unnamed Profile";
        bioEl.innerText = pdata.bio || "No bio provided.";
        emailEl.innerText = pdata.email || "-";
        phoneEl.innerText = pdata.phone || "-";

        // Populate Skills
        if (pdata.skills && pdata.skills.length > 0) {
            skillsListEl.innerHTML = pdata.skills
                .map(skill => `<span class="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">${skill}</span>`)
                .join(' ');
        } else {
            skillsListEl.innerHTML = `<span class="text-light-muted text-xs">No skills listed.</span>`;
        }

        // --- 2. Load Projects ---
        // This is an assumed endpoint, based on your original script mentioning projects
        const projectsResponse = await fetch(`http://localhost:5000/get_projects/${account}`);
        if (!projectsResponse.ok) {
            throw new Error(`HTTP error! status: ${projectsResponse.status}`);
        }
        const projectsData = await projectsResponse.json();

        // Populate Projects List
        if (projectsData && projectsData.length > 0) {
            projectsListEl.innerHTML = projectsData
                .map(project => createProjectCardHTML(project))
                .join('');
        } else {
            projectsListEl.innerHTML = `<p class="text-light-muted">No projects added yet.</p>`;
        }

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        projectsListEl.innerHTML = `<p class="text-red-400">Could not load projects. ${error.message}</p>`;
        nameEl.innerText = "Error Loading Profile";
        bioEl.innerText = "Could not connect to the server.";
    }
}

/**
 * Helper function to create the HTML for a single project card.
 * @param {object} project - The project data object
 */
function createProjectCardHTML(project) {
    // Default project structure
    const p = {
        title: project.title || "Untitled Project",
        description: project.description || "No description.",
        tags: project.tags || [],
        status: project.status || "In Progress",
        link: project.link || "#"
    };

    const statusColor = p.status.toLowerCase() === 'completed' 
        ? 'text-green-400 bg-green-900/50' 
        : 'text-yellow-400 bg-yellow-900/50';

    const tagsHTML = p.tags
        .map(tag => `<span class="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">${tag}</span>`)
        .join(' ');

    return `
    <div class="bg-primary-dark border border-gray-700 rounded-lg p-6 flex flex-col sm:flex-row gap-6 hover:border-blue-500 transition duration-300 ease-in-out">
        <div class="flex-grow">
            <h4 class="text-xl font-bold text-white">${p.title}</h4>
            <p class="text-light-muted text-sm mt-2 mb-4">${p.description}</p>
            <div class="flex flex-wrap gap-2">
                ${tagsHTML}
            </div>
        </div>
        <div class="flex-shrink-0 flex flex-col sm:items-end justify-between gap-4">
            <span class="text-xs font-semibold px-3 py-1 rounded-full ${statusColor}">${p.status}</span>
            <a href="${p.link}" class="text-blue-400 hover:text-blue-300 font-semibold" target="_blank" rel="noopener noreferrer">
                View Details &rarr;
            </a>
        </div>
    </div>
    `;
}