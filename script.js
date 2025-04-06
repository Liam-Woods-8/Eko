const clientId = 'c657fb177a1a40028c32789cdd1acc9f';
const clientSecret = 'a45ef6eb9b744e899445b7c8ae7f5705';

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

async function searchTrack(songName, token) {
  const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(songName)}&type=track&limit=1`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  return data.tracks.items[0]; // first track match
}

async function getAudioFeatures(trackId, token) {
  const response = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  return data;
}

async function getArtistGenre(artistId, token) {
  const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  return data.genres[0] || 'Unknown';
}

function convertKey(key) {
  const keys = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'];
  return keys[key] || 'Unknown';
}

function checkCompatibility(key1, key2, bpm1, bpm2) {
  const keyDiff = Math.abs(key1 - key2);
  const bpmDiff = Math.abs(bpm1 - bpm2);

  let score = 10;

  // Key compatibility
  if (key1 === key2) {
    score -= 0;
  } else if (keyDiff === 1 || keyDiff === 11) {
    score -= 2;
  } else if (keyDiff === 2) {
    score -= 4;
  } else {
    score -= 6;
  }

  // BPM difference penalty
  if (bpmDiff <= 3) {
    score -= 0;
  } else if (bpmDiff <= 7) {
    score -= 1;
  } else if (bpmDiff <= 10) {
    score -= 2;
  } else {
    score -= 3;
  }

  // Clamp score between 1–10
  if (score < 1) score = 1;
  if (score > 10) score = 10;

  // Add a label
  let label;
  if (score >= 9) label = "🔥 Perfect Match";
  else if (score >= 7) label = "🎧 Great Mix";
  else if (score >= 5) label = "🎵 Decent Mix";
  else if (score >= 3) label = "⚠️ Risky Mix";
  else label = "❌ Not Recommended";

  return `${label} (${score}/10)`;
}

document.getElementById('compare-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const song1 = document.getElementById('song1-input').value.trim();
  const song2 = document.getElementById('song2-input').value.trim();

  if (!song1 || !song2) {
    alert("Please enter both songs.");
    return;
  }

  try {
    const token = await getSpotifyToken();

    // Fetch both tracks
    const [track1, track2] = await Promise.all([
      searchTrack(song1, token),
      searchTrack(song2, token)
    ]);

    // Fetch audio features
    const [features1, features2] = await Promise.all([
      getAudioFeatures(track1.id, token),
      getAudioFeatures(track2.id, token)
    ]);

    // Fetch genres
    const [genre1, genre2] = await Promise.all([
      getArtistGenre(track1.artists[0].id, token),
      getArtistGenre(track2.artists[0].id, token)
    ]);

    // Fill in song 1 data
    document.getElementById('title-1').textContent = track1.name;
    document.getElementById('artist-1').textContent = track1.artists[0].name;
    document.getElementById('genre-1').textContent = genre1;
    document.getElementById('bpm-1').textContent = Math.round(features1.tempo);
    document.getElementById('key-1').textContent = convertKey(features1.key);
    document.getElementById('energy-1').textContent = Math.round(features1.energy * 100) + '%';

    // Fill in song 2 data
    document.getElementById('title-2').textContent = track2.name;
    document.getElementById('artist-2').textContent = track2.artists[0].name;
    document.getElementById('genre-2').textContent = genre2;
    document.getElementById('bpm-2').textContent = Math.round(features2.tempo);
    document.getElementById('key-2').textContent = convertKey(features2.key);
    document.getElementById('energy-2').textContent = Math.round(features2.energy * 100) + '%';

    // Show the results section
    document.getElementById('comparison-results').classList.remove('d-none');

    // Analyze compatibility
    const compatibility = checkCompatibility(features1.key, features2.key, features1.tempo, features2.tempo);
    document.getElementById('compatibility-result').textContent = compatibility;

  } catch (error) {
    console.error("Something went wrong:", error);
    alert("There was a problem retrieving song data. Please try again.");
  }
});