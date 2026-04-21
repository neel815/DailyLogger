document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const saveBtn = document.getElementById('saveBtn');
    const historyBtn = document.getElementById('historyBtn');
    const statusMessage = document.getElementById('statusMessage');
    const whatDidIDo = document.getElementById('whatDidIDo');
    const whatWillIDo = document.getElementById('whatWillIDo');
    const blockers = document.getElementById('blockers');
    const backendUrl = 'https://dailylogger-production.up.railway.app';

    const today = new Date().toISOString().split('T')[0];

    resetForm();

    generateBtn.addEventListener('click', generateFromGitHub);
    saveBtn.addEventListener('click', saveEntry);
    historyBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
        chrome.tabs.query({}, () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
        });
    });

    async function generateFromGitHub() {
        showStatus('Fetching GitHub commits...', 'loading');
        generateBtn.disabled = true;

        try {
            const settings = await chrome.storage.local.get(['githubUsername', 'githubToken']);

            if (!settings.githubUsername || !settings.githubToken) {
                showStatus('GitHub credentials are required in settings.', 'error');
                generateBtn.disabled = false;
                return;
            }

            const commits = await fetchGitHubCommits(settings.githubUsername, settings.githubToken, today);

            if (commits.length === 0) {
                showStatus('No commits found for today.', 'info');
                whatDidIDo.value = 'No commits found for today.';
                generateBtn.disabled = false;
                return;
            }

            showStatus('Generating summary with AI...', 'loading');

            const response = await fetch(`${backendUrl}/summarize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ commits })
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                showStatus(data.error || 'Failed to generate summary.', 'error');
                generateBtn.disabled = false;
                return;
            }

            whatDidIDo.value = data.summary || '';
            showStatus('Summary generated successfully.', 'success');
        } catch (error) {
            console.error('Error:', error);
            showStatus(`Error: ${error.message}`, 'error');
        }

        generateBtn.disabled = false;
    }

    async function fetchGitHubCommits(username, token, date) {
        const query = `author:${username} author-date:>=${date}T00:00:00Z`;
        const url = `https://api.github.com/search/commits?q=${encodeURIComponent(query)}&per_page=100`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.items) {
            return [];
        }

        const seen = new Set();
        return data.items
            .map(item => {
                const repoName = item.repository.name;
                const message = item.commit.message.split('\n')[0];
                return `[${repoName}] ${message}`;
            })
            .filter(commit => {
                if (seen.has(commit)) {
                    return false;
                }

                seen.add(commit);
                return true;
            });
    }

    function saveEntry() {
        const entry = {
            whatDidIDo: whatDidIDo.value,
            whatWillIDo: whatWillIDo.value,
            blockers: blockers.value,
            date: today,
            timestamp: new Date().toISOString()
        };

        chrome.storage.local.get([today], () => {
            const storageData = { [today]: entry };
            chrome.storage.local.set(storageData, () => {
                showStatus('Entry saved successfully.', 'success');
                setTimeout(() => showStatus('', ''), 2000);
            });
        });
    }

    function resetForm() {
        whatDidIDo.value = '';
        whatWillIDo.value = '';
        blockers.value = '';
    }

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message status-${type}`;
    }
});
