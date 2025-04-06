const clientId = 'c657fb177a1a40028c32789cdd1acc9f';
const clientSecret = 'a45ef6eb9b744e899445b7c8ae7f5705';

// Spotify API: Get Access Token
async function getSpotifyToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await response.json();
  return data.access_token;
}

// Spotify API: Search for Track
async function searchSpotifyTrack(trackQuery, token) {
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(trackQuery)}&type=track&limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const data = await response.json();
  return data.tracks.items[0];
}

// Spotify API: Get Artist Genre
async function getArtistGenre(artistId, token) {
  const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data.genres[0] || "Unknown";
}

// iTunes API: Search for Track (Artwork & Preview)
async function searchiTunesTrack(trackQuery) {
  const response = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(trackQuery)}&entity=song&limit=1`
  );
  const data = await response.json();
  return data.results[0];
}

// Initialize WaveSurfer globally
let wavesurfer = null;

// Function to create waveform
function createWaveform(audioUrl) {
  if (wavesurfer) {
    wavesurfer.destroy();
  }

  wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#ffffff',
    progressColor: '#0d6efd',
    barWidth: 3,
    barGap: 2,
    height: 80,
    responsive: true,
    barRadius: 2,
    cursorWidth: 0,
    backend: 'WebAudio',
    normalize: true,
    interact: true
  });

  wavesurfer.load(audioUrl);

  // Remove auto-play once waveform loaded
  wavesurfer.on('ready', () => {
    // Do not auto-play
  });

  // Play/Pause button controls
  document.getElementById('playPauseBtn').onclick = () => {
    wavesurfer.playPause();
  };
}

// Form Submission Handler
document.getElementById('track-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const trackQuery = document.getElementById('track-input').value.trim();

  if (!trackQuery) {
    alert("Please enter a song name or artist.");
    return;
  }

  try {
    const token = await getSpotifyToken();

    // Fetch Spotify track data
    const spotifyTrack = await searchSpotifyTrack(trackQuery, token);
    if (!spotifyTrack) {
      alert("Track not found on Spotify. Try another search.");
      return;
    }

    // Fetch Spotify artist genre
    const genre = await getArtistGenre(spotifyTrack.artists[0].id, token);

    // Fetch iTunes track data
    const itunesTrack = await searchiTunesTrack(`${spotifyTrack.name} ${spotifyTrack.artists[0].name}`);

    // Populate DOM with track info
    document.getElementById('track-title').textContent = spotifyTrack.name;
    document.getElementById('track-artist').textContent = spotifyTrack.artists[0].name;
    document.getElementById('track-genre').textContent = genre;

    // Album Artwork from iTunes
    if (itunesTrack && itunesTrack.artworkUrl100) {
      document.getElementById('track-artwork').src = itunesTrack.artworkUrl100.replace('100x100', '300x300');
      document.getElementById('track-artwork').alt = spotifyTrack.name;
    } else {
      document.getElementById('track-artwork').src = '';
      document.getElementById('track-artwork').alt = 'No artwork available';
    }

    // Audio Preview from iTunes or fallback to Spotify
    let previewUrl = "";
    if (itunesTrack && itunesTrack.previewUrl) {
      previewUrl = itunesTrack.previewUrl;
    } else if (spotifyTrack.preview_url) {
      previewUrl = spotifyTrack.preview_url;
    }

    if (previewUrl) {
      createWaveform(previewUrl); // Generate waveform visualization
    } else {
      if (wavesurfer) wavesurfer.destroy();
      alert("No audio preview available for this track.");
    }

    // Display results section
    document.getElementById('track-results').classList.remove('d-none');

  } catch (error) {
    console.error("Error retrieving track data:", error);
    alert("There was a problem retrieving the track details. Please try again.");
  }
});