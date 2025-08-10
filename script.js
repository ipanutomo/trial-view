// Configuration
const API_URL = "https://script.google.com/macros/s/AKfycbx9P4v0rcmcNgdaInqtGSB-Mo0ldfWWDTpdR-x26ec7ept-YXivAaA7yuZkh6To6Do4/exec";
const TOP_SCORERS_API_URL = "https://script.google.com/macros/s/AKfycbyfRoUclJoA7lFVmkToxEdAE3F6n4zVpG1wwnvBpmhwHV9WR9SAUS2N2HDFS0Mq3gMtKw/exec";
// DOM Elements
const matchTableBody = document.getElementById('matchData');
const groupAccordion = document.getElementById('groupAccordion');

/* ========== UTILITY FUNCTIONS ========== */

// Format date to dd-mm-yy
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
}

/* ========== RENDER FUNCTIONS ========== */

// Render match schedule
function renderMatches(matches) {
    if (!matches || matches.length === 0) {
        matchTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Tidak ada jadwal pertandingan</td></tr>';
        return;
    }

    matchTableBody.innerHTML = matches.map(match => `
        <tr class="match-row">
            <td>${formatDate(match.Tanggal)}</td>
            <td>${match.Waktu || '-'}</td>
            <td><span class="badge group-badge bg-primary">Group ${match.Group}</span></td>
            <td class="team-name text-end">${match['Team 1'] || '-'}</td>
            <td class="score text-center">${match['Skor 1'] || '0'} : ${match['Skor 2'] || '0'}</td>
            <td class="team-name">${match['Team 2'] || '-'}</td>
        </tr>
    `).join('');
}

// Render group standings
function renderStandings(standings) {
    if (!standings || Object.keys(standings).length === 0) {
        groupAccordion.innerHTML = '<div class="text-center py-4">Tidak ada data klasemen</div>';
        return;
    }

    groupAccordion.innerHTML = Object.keys(standings).map((group, index) => `
        <div class="accordion-item">
            <h2 class="accordion-header" id="heading${group}">
                <button class="accordion-button ${index === 0 ? '' : 'collapsed'}" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#collapse${group}" 
                        aria-expanded="${index === 0 ? 'true' : 'false'}">
                    Group ${group}
                </button>
            </h2>
            <div id="collapse${group}" 
                 class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" 
                 aria-labelledby="heading${group}">
                <div class="accordion-body p-0">
                    <table class="table standings-table">
                        <thead>
                            <tr>
                                <th>Team</th>
                                <th>P</th>
                                <th>W</th>
                                <th>D</th>
                                <th>L</th>
                                <th>GF</th>
                                <th>GA</th>
                                <th>GD</th>
                                <th>Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${standings[group].map(team => `
                                <tr>
                                    <td>${team.team}</td>
                                    <td>${team.played}</td>
                                    <td>${team.won}</td>
                                    <td>${team.drawn}</td>
                                    <td>${team.lost}</td>
                                    <td>${team.gf}</td>
                                    <td>${team.ga}</td>
                                    <td>${team.gd > 0 ? '+' : ''}${team.gd}</td>
                                    <td><strong>${team.points}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `).join('');
}

/* ========== DATA PROCESSING ========== */

// Calculate standings from matches
function calculateStandings(matches) {
    const teamGroups = {
        'A': ['RT 1', 'RT 7', 'RT 8', 'RT 9', 'RT 10', 'RT 11'],
        'B': ['RT 2', 'RT 3', 'RT 4', 'RT 5', 'RT 6', 'RT 12']
    };

    const standings = {};
    
    // Pertama, inisialisasi semua tim dengan played = 0
    Object.keys(teamGroups).forEach(group => {
        standings[group] = {};
        teamGroups[group].forEach(team => {
            standings[group][team] = {
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                gf: 0,
                ga: 0,
                gd: 0,
                points: 0
            };
        });
    });

    // Proses pertandingan yang sudah ada skornya
    matches.forEach(match => {
        const group = match.Group;
        const team1 = match['Team 1'];
        const team2 = match['Team 2'];
        const score1 = parseInt(match['Skor 1']) || 0;
        const score2 = parseInt(match['Skor 2']) || 0;

        // Skip jika data tidak lengkap atau skor kosong
        if (!group || !team1 || !team2 || 
            match['Skor 1'] === "" || match['Skor 2'] === "") return;

        const t1 = standings[group][team1];
        const t2 = standings[group][team2];
        if (!t1 || !t2) return;

        // Update statistik
        t1.played++;
        t2.played++;
        t1.gf += score1;
        t1.ga += score2;
        t2.gf += score2;
        t2.ga += score1;

        if (score1 > score2) {
            t1.won++;
            t2.lost++;
            t1.points += 3;
        } else if (score1 < score2) {
            t2.won++;
            t1.lost++;
            t2.points += 3;
        } else {
            t1.drawn++;
            t2.drawn++;
            t1.points += 1;
            t2.points += 1;
        }

        t1.gd = t1.gf - t1.ga;
        t2.gd = t2.gf - t2.ga;
    });

    // Filter hanya tim yang sudah bertanding
    const result = {};
    Object.keys(standings).forEach(group => {
        result[group] = Object.keys(standings[group])
            .filter(team => standings[group][team].played > 0) // Hanya tim yang sudah bermain
            .map(team => ({ team, ...standings[group][team] }))
            .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
    });

    return result;
}

/* ========== API HANDLING ========== */

// Fetch data from API
// Fetch data from API
async function fetchData() {
    try {
        // Tampilkan loading state
        matchTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Memuat data...</td></tr>';
        document.getElementById('topScorersSummaryData').innerHTML = '<tr><td colspan="3" class="text-center py-4">Memuat data...</td></tr>';
        
        // Gunakan Promise.all untuk fetch kedua API sekaligus
        const [matchesResponse, scorersResponse] = await Promise.all([
            fetch(API_URL),
            fetch(TOP_SCORERS_API_URL)
        ]);
        
        // Handle response matches
        if (!matchesResponse.ok) throw new Error(`Error HTTP! Status: ${matchesResponse.status}`);
        const matchesData = await matchesResponse.json();
        if (!Array.isArray(matchesData)) throw new Error("Format data pertandingan tidak valid");
        
        // Handle response scorers
        if (!scorersResponse.ok) throw new Error(`Error HTTP Top Scorers! Status: ${scorersResponse.status}`);
        const scorersData = await scorersResponse.json();
        
        // Proses dan render data
        const standings = calculateStandings(matchesData);
        renderMatches(matchesData);
        renderStandings(standings);
        renderTopScorers(scorersData);
        
    } catch (error) {
        console.error('Gagal memuat data:', error);
        
        // Error handling untuk match table
        matchTableBody.innerHTML = `
            <tr><td colspan="6" class="text-center py-4 text-danger">
                Gagal memuat data pertandingan. Silakan coba lagi nanti.
            </td></tr>
        `;
        
        // Error handling untuk top scorers
        document.getElementById('topScorersSummaryData').innerHTML = `
            <tr><td colspan="3" class="text-center py-4 text-danger">
                Gagal memuat data top scorers. Error: ${error.message}
            </td></tr>
        `;
    }
}

/* ========== INITIALIZATION ========== */

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    if (API_URL && !API_URL.includes("PASTE_YOUR_APPS_SCRIPT_API_URL_HERE")) {
        fetchData();
    } else {
        matchTableBody.innerHTML = `
            <tr><td colspan="6" class="text-center py-4 text-danger">
                URL API belum diatur. Silakan edit file script.js.
            </td></tr>
        `;
    }
});

// Fungsi untuk memproses data top scorers
function processTopScorers(scorers) {
    if (!scorers || scorers.length === 0) return { summary: [], detail: [] };
    
    // Hitung total gol per pemain
    const playerStats = {};
    scorers.forEach(scorer => {
        const key = `${scorer.nama}|${scorer.team}`;
        if (!playerStats[key]) {
            playerStats[key] = {
                nama: scorer.nama,
                team: scorer.team,
                total: 0,
                goals: []
            };
        }
        playerStats[key].total++;
        playerStats[key].goals.push(scorer);
    });
    
    // Buat array summary dan urutkan berdasarkan total gol
    const summary = Object.values(playerStats)
        .sort((a, b) => b.total - a.total || a.nama.localeCompare(b.nama));
    
    return {
        summary,
        detail: scorers.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
    };
}

// Fungsi untuk render top scorers
function renderTopScorers(scorers) {
    const processed = processTopScorers(scorers);
    const summaryElement = document.getElementById('topScorersSummaryData');
    const detailElement = document.getElementById('topScorersDetailData');
    
    if (processed.summary.length === 0) {
        summaryElement.innerHTML = '<tr><td colspan="3" class="text-center py-4">Tidak ada data top scorers</td></tr>';
        detailElement.innerHTML = '<tr><td colspan="4" class="text-center py-4">Tidak ada data detail gol</td></tr>';
        return;
    }
    
    // Render summary
    summaryElement.innerHTML = processed.summary.map(player => `
        <tr>
            <td><strong>${player.nama}</strong></td>
            <td>${player.team}</td>
            <td><span class="badge bg-danger">${player.total} Gol</span></td>
        </tr>
    `).join('');
    
    // Render detail
    detailElement.innerHTML = processed.detail.map(goal => `
        <tr>
            <td>${formatDate(goal.tanggal)}</td>
            <td>${goal.team}</td>
            <td>${goal.nama}</td>
            <td>${goal.keterangan || '-'}</td>
        </tr>
    `).join('');
}