const progressBarValue = document.getElementById("music_progress_bar");
const song = document.getElementById("song");
const play = document.getElementById("playButton");
let currentQueue = [];
let previousQueue = []; // Queue for previously played songs
let isLooping = false;

//TODO: <<< PLAYING SONG AND HANDLING ITS FEATURES >>>
//* Homepage progress bar update -:
function updateTime() {
  let minutes = Math.floor(song.currentTime / 60);
  let seconds = Math.round(song.currentTime - minutes * 60);
  document.querySelector(".current-time").innerHTML =
    minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  progressBarValue.value = song.currentTime;
}

song.addEventListener("timeupdate", updateTime);

function handleProgressInput() {
  console.log("-------");
  song.currentTime = progressBarValue.value;
  let minutes = Math.floor(song.currentTime / 60);
  let seconds = Math.round(song.currentTime - minutes * 60);
  document.querySelector(".current-time").innerHTML =
    minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}

progressBarValue.addEventListener("input", handleProgressInput);
progressBarValue.addEventListener("mousedown", function () {
  song.removeEventListener("timeupdate", updateTime);
});
progressBarValue.addEventListener("mouseup", function () {
  song.addEventListener("timeupdate", updateTime);
});

//* Play-Pause event
const playPause = (event) => {
  if (event) {
    event.stopPropagation();
  }
  if (play.classList.contains("fa-pause")) {
    song.pause();
    play.classList.remove("fa-pause");
    play.classList.add("fa-play");
  } else {
    song.play();
    play.classList.remove("fa-play");
    play.classList.add("fa-pause");
  }
};

//* On loading song, to set song total time in UI (0 to ending time) -:
song.onloadedmetadata = function () {
  progressBarValue.max = song.duration;
  let minutes = Math.floor(song.duration / 60);
  let seconds = Math.round(song.duration - minutes * 60);
  document.querySelector(".ending-time").innerHTML =
    minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  progressBarValue.value = song.currentTime;
};

//* Function to set the song name with ellipsis if it exceeds a certain length
function setSongNameWithEllipsis(songName, maxLength) {
  if (songName.length > maxLength) {
    return songName.substring(0, maxLength) + "...";
  }
  return songName;
}

//** <<< UPDATE UI WITH FETCHED SONG DATA >>>
const updateUIWithSongData = (data) => {
  // Set the audio source
  document.querySelector(".audio-link").setAttribute("src", data.url);

  // Set the song image thumbnail
  document
    .getElementById("song-image")
    .setAttribute(
      "src",
      data.thumbnail_url
    );

  // Set the song name with ellipsis
  document.getElementById("song-name").innerHTML = setSongNameWithEllipsis(
    data.title,
    30
  );

  // Set the song artist
  document.getElementById("song-artist").innerHTML =
  data.artist;

  // Reset the play/pause button to play, initializing for playPause function to run properly
  play.classList.remove("fa-pause");
  play.classList.add("fa-play");

  // Call the playPause function to set the correct play/pause icon based on sessionStorage
  playPause();
};

function playSong(videoId) {
  console.log(videoId);
  fetchSong(videoId);
}

const fetchSong = async (videoId) => {
  try {
    const response = await fetch(`/playSong?videoId=${videoId}`, {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
    });
    const data = await response.json();
    console.log(data);

    // Create a song object with the fetched data
    const songData = {
      title: data.title,
      artist: data.artist,
      thumbnail_url: data.thumbnail_url,
      url: data.url,
      videoId: data.videoId,
    };
    // Add the song to the local storage queue
    addToLocalStorageQueue(songData);

    // Update the UI with the fetched song data
    updateUIWithSongData(data);

  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      // handle network errors and timeouts
      console.log("Something went wrong! Trying again..");
    } else if (error.response && error.response.status === 403) {
      console.log("Something went wrong! Trying again...");
    }
  }
};

const handleSongOnLoop = () => {
  isLooping = !isLooping;
  song.loop = isLooping;
  let repeat_on_loop_button = document.getElementById("song-repeat-on-loop");
  if (isLooping) repeat_on_loop_button.classList.add("active");
  else repeat_on_loop_button.classList.remove("active");
};

//TODO: <<< PLAYING SONG FUNCTIONS END >>>

//TODO: <<< QUEUE FUNCTIONS START >>>

//! <<< Load queue from local storage when the page loads >>>
function loadQueueFromLocalStorage() {
  currentQueue = JSON.parse(localStorage.getItem("songsQueue")) || [];
}

//! <<< Update the local storage queue with the latest data >>>
function updateLocalStorageQueue() {
  localStorage.setItem("songsQueue", JSON.stringify(currentQueue));
}

//! <<< Function to add a song to the local storage queue >>>
function addToLocalStorageQueue(songData) {
  currentQueue.push(songData); // Add to the currentQueue
  updateLocalStorageQueue(); // Update local storage
}

//* Function to play the next song from the queue
const playNextSong = (videoId = null) => {
  // If videoId is provided, it means the user selected a specific song to play next
  if (videoId) {
    fetchSong(videoId).then((data) => {
      // Update UI with the fetched song data
      updateUIWithSongData(data);
      // Create a song object with the fetched data
      const songData = {
        title: data.title,
        artist: data.artist,
        thumbnail_url: data.thumbnail_url,
        videoId: data.videoId,
        url: data.url,
      };
      // Add the song to the beginning of the current queue
      addToBeginningOfQueue(songData);
      // Ensure the queue has a maximum of 25 songs
      maintainQueueSize();
    });
  } else {
    // If there is no videoId provided, it means play the next song from the currentQueue
    if (currentQueue.length > 0) {
      previousQueue.push(currentQueue.shift()); // Move the currently playing song to the previousQueue

      // Get the next song from the current queue
      const nextSong = getCurrentSongFromCurrentQueue();
      if (nextSong) {
        // Update UI with the next song data directly from the nextSong object
        document.querySelector(".audio-link").setAttribute("src", nextSong.url);
        document.getElementById("song-image").setAttribute("src", nextSong.thumbnail);
        document.getElementById("song-name").innerHTML = setSongNameWithEllipsis(nextSong.title, 30);
        document.getElementById("song-artist").innerHTML = nextSong.artist;
        // Reset the play/pause button to play, initializing for playPause function to run properly
        play.classList.remove("fa-pause");
        play.classList.add("fa-play");
        playPause(); // Play the next song
      }

      updateLocalStorageQueue(); // Update local storage with the updated queues
    } else {
      // If the current queue is empty, auto-populate the queue with 25 random songs
      fetchRandomSongs(25).then((randomSongsData) => {
        // Add the songs to the current queue
        randomSongsData.forEach((songData) => {
          addToBeginningOfQueue(songData);
        });
        // Play the first song from the queue
        playNextSong();
      });
    }
  }
};

//* Function to add a song to the beginning of the queue
function addToBeginningOfQueue(songData) {
  currentQueue.unshift(songData); // Add the song to the beginning of the currentQueue
}

//* Function to maintain the queue size to a maximum of 25 songs
function maintainQueueSize() {
  if (currentQueue.length > 25) {
    currentQueue.pop(); // Remove the last song in the queue to maintain the size
  }
}

//* Function to fetch random songs data
const fetchRandomSongs = async(count) => {
  // Implementing the logic to fetch random songs data from data source
  // For example, we can fetch from an API or database
  try {
    let randomSongsData = [];
    const fetchRandomSingleSong = async() => {
      try {
        const response = await fetch("/playSong");
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching random song:", error);
        return null;
      }
    }

    // Use Promise.all to fetch 25 random songs concurrently
    const fetchPromise = Array.from({length: count}, ()=> fetchRandomSingleSong());
    const fetchedSongs = await Promise.all(fetchPromise);

    // Filter out any null values (songs that failed to fetch)
    const validSongs = fetchedSongs.filter((songData) => songData !== null);

    // Map each fetched song data to the desired format (songData object)
    const formattedSongs = validSongs.map((data) => ({
      title: data.title,
      artist: data.artist,
      thumbnail_url: data.thumbnail_url,
      videoId: data.videoId,
      url: data.url,
    }));

    // Add the fetched songs to the randomSongsData array
    randomSongsData.push(...formattedSongs);
  } catch (error) {
    console.error("Error fetching random songs:", error);
    return [];
  }
}

//* Function to play the previous song from the queue
const playPreviousSong = () => {
  if (previousQueue.length > 0) {
    currentQueue.unshift(previousQueue.pop()); // Move the last played song to the currentQueue
    // ... (update UI and play the previous song, similar to previous code)
    playPause();
    updateLocalStorageQueue(); // Update local storage with the updated queues
  }
};

//! <<< Function to remove a song from the local storage queue by its index >>>
function removeSongFromLocalStorageQueue(index) {
  if (index >= 0 && index < currentQueue.length) {
    currentQueue.splice(index, 1); // Remove the song at the given index
    updateLocalStorageQueue(); // Update local storage with the updated queue
  }
}

//! <<< Function to clear the local storage queue >>>
function clearLocalStorageQueue() {
  currentQueue = [];
  updateLocalStorageQueue();
}

//* Function to get the current song from the queue without removing it
function getCurrentSongFromCurrentQueue() {
  if (currentQueue.length > 0) {
    return currentQueue[0];
  }
  return null;
}

//* Function to check if the queue is empty
function isCurrentQueueEmpty() {
  return currentQueue.length === 0;
}
//TODO: <<< QUEUE FUNCTIONS END >>>
