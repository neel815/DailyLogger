document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const exportBtn = document.getElementById('exportBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const entriesList = document.getElementById('entriesList');
    
    let allEntries = [];
    
    loadEntries();
    
    searchInput.addEventListener('input', filterEntries);
    exportBtn.addEventListener('click', exportAsCSV);
    settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    
    function loadEntries() {
        chrome.storage.local.get(null, (items) => {
            // Filter out non-entry items (like settings)
            allEntries = Object.entries(items)
                .filter(([key, value]) => {
                    // Check if it's a date entry (YYYY-MM-DD format) and has the expected structure
                    return /^\d{4}-\d{2}-\d{2}$/.test(key) && 
                           value && 
                           typeof value === 'object' && 
                           'whatDidIDo' in value;
                })
                .map(([date, data]) => ({
                    date,
                    ...data
                }))
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            
            displayEntries(allEntries);
        });
    }
    
    function displayEntries(entries) {
        if (entries.length === 0) {
            entriesList.innerHTML = '<p class="placeholder">No entries found. Start by creating a standup in the popup!</p>';
            return;
        }
        
        entriesList.innerHTML = entries.map(entry => `
            <div class="entry-card">
                <div class="entry-header">
                    <h3>${formatDate(entry.date)}</h3>
                    <button class="btn-delete" onclick="deleteEntry('${entry.date}')">Delete</button>
                </div>
                <div class="entry-content">
                    <div class="entry-section">
                        <h4>What did I do today?</h4>
                        <p>${escapeHtml(entry.whatDidIDo || '(no entry)')}</p>
                    </div>
                    <div class="entry-section">
                        <h4>What will I do tomorrow?</h4>
                        <p>${escapeHtml(entry.whatWillIDo || '(no entry)')}</p>
                    </div>
                    <div class="entry-section">
                        <h4>Any blockers?</h4>
                        <p>${escapeHtml(entry.blockers || '(no entry)')}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    function filterEntries() {
        const query = searchInput.value.toLowerCase();
        const filtered = allEntries.filter(entry => 
            entry.whatDidIDo.toLowerCase().includes(query) ||
            entry.whatWillIDo.toLowerCase().includes(query) ||
            entry.blockers.toLowerCase().includes(query) ||
            entry.date.includes(query)
        );
        displayEntries(filtered);
    }
    
    function exportAsCSV() {
        if (allEntries.length === 0) {
            alert('No entries to export');
            return;
        }
        
        const headers = ['Date', 'What did I do today?', 'What will I do tomorrow?', 'Any blockers?'];
        const rows = allEntries.map(entry => [
            entry.date,
            `"${(entry.whatDidIDo || '').replace(/"/g, '""')}"`,
            `"${(entry.whatWillIDo || '').replace(/"/g, '""')}"`,
            `"${(entry.blockers || '').replace(/"/g, '""')}"`
        ]);
        
        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `standup-history-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    window.deleteEntry = function(date) {
        if (confirm(`Delete entry for ${date}?`)) {
            chrome.storage.local.remove([date], () => {
                loadEntries();
            });
        }
    };
    
    function formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
});
