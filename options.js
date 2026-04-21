document.addEventListener('DOMContentLoaded', () => {
    const githubUsername = document.getElementById('githubUsername');
    const githubToken = document.getElementById('githubToken');
    const saveBtn = document.getElementById('saveBtn');
    const testBtn = document.getElementById('testBtn');
    const historyLink = document.getElementById('historyLink');
    const statusMessage = document.getElementById('statusMessage');

    loadSettings();

    saveBtn.addEventListener('click', saveSettings);
    testBtn.addEventListener('click', testConnections);
    historyLink.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
    });

    function loadSettings() {
        chrome.storage.local.get(['githubUsername', 'githubToken'], result => {
            if (result.githubUsername) githubUsername.value = result.githubUsername;
            if (result.githubToken) githubToken.value = result.githubToken;
        });
    }

    function saveSettings() {
        const settings = {
            githubUsername: githubUsername.value.trim(),
            githubToken: githubToken.value.trim()
        };

        if (!settings.githubUsername || !settings.githubToken) {
            showStatus('All fields are required.', 'error');
            return;
        }

        chrome.storage.local.set(settings, () => {
            showStatus('Settings saved successfully.', 'success');
            setTimeout(() => showStatus('', ''), 2000);
        });
    }

    async function testConnections() {
        showStatus('Testing GitHub connection...', 'loading');
        testBtn.disabled = true;

        try {
            const settings = {
                githubUsername: githubUsername.value.trim(),
                githubToken: githubToken.value.trim()
            };

            if (!settings.githubUsername || !settings.githubToken) {
                showStatus('All fields are required for testing.', 'error');
                testBtn.disabled = false;
                return;
            }

            const githubResponse = await fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${settings.githubToken}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            });

            if (!githubResponse.ok) {
                throw new Error(`GitHub API error: ${githubResponse.status}`);
            }

            const githubData = await githubResponse.json();
            if (githubData.login !== settings.githubUsername) {
                throw new Error('GitHub username does not match token');
            }

            showStatus('GitHub connection working correctly.', 'success');
        } catch (error) {
            console.error('Test error:', error);
            showStatus(`Test failed: ${error.message}`, 'error');
        }

        testBtn.disabled = false;
    }

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message status-${type}`;
    }
});
