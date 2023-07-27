const progressBarValue = document.getElementById("music_progress_bar");
const song = document.getElementById("song");
const play = document.getElementById("playButton");
let currentQueue = [];
let previousQueue = []; // Queue for previously played songs
let isLooping = false;
// let isFetchingRandomSongs = false;
// Initialize the Web Worker
const fetchSongsWorker = new Worker("../static/javascript/fetchSongsWorker.js");



// //* Create a proxy for the currentQueue
// const currentQueueProxy = new Proxy(currentQueue, {
//   set: function (target, property, value) {
//     target[property] = value;
//     updateCurrentQueueUI(); // Call the function to update the UI whenever the currentQueue is modified
//     return true;
//   },
// });







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
const updateUIWithSongDataAndPlay = (data) => {
  // Set the audio source
  document.querySelector(".audio-link").setAttribute("src", data.url);

  // Set the song image thumbnail
  document.getElementById("song-image").setAttribute("src", data.thumbnail_url);

  // Set the song name with ellipsis
  document.getElementById("song-name").innerHTML = setSongNameWithEllipsis(
    data.title,
    30
  );

  // Set the song artist
  document.getElementById("song-artist").innerHTML = data.artist;

  // Set the video ID as a data attribute on the current liked song icon in current music block to manage like/unlike of current playing songs.
  const currentLikedSongIcon = document.getElementById("like-current-song");
  currentLikedSongIcon.setAttribute("song-video-id", data.videoId);

  // Reset the play/pause button to play, initializing for playPause function to run properly
  play.classList.remove("fa-pause");
  play.classList.add("fa-play");

  // Call the playPause function to set the correct play/pause icon
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
    addToBeginningOfPreviousQueue(songData);
    // Update the UI with the fetched song data
    updateUIWithSongDataAndPlay(data);
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

//TODO: <<< Function to send a message to the Web Worker and receive a response >>>
const sendMessageToWorker = (type, data) => {
  return new Promise((resolve, reject) => {
    // Handle errors from the worker
    fetchSongsWorker.onerror = (error) => {
      reject(error);
    };

    // Once the response is received from the worker, handle it
    fetchSongsWorker.onmessage = (event) => {
      if (event.data.type === "FETCH_RANDOM_SONGS_RESPONSE") {
        resolve(event.data.data);
      }
    };

    // Send a message to the worker
    fetchSongsWorker.postMessage({ type, data });
  });
};

//* Function to fetch random songs data using the Web Worker
const fetchRandomSongs = async (count) => {
  try {
    const response = await sendMessageToWorker("FETCH_RANDOM_SONGS", count);
    return response;
  } catch (error) {
    console.error("Error fetching random songs:", error);
    return null;
  }
};

// // Function to fetch random songs data
// const fetchRandomSongs = async (count) => {

//   // Check if fetchRandomSongs is already running
//   if (isFetchingRandomSongs) {
//     console.log("fetchRandomSongs is already running. Skipping the request.");
//     return null;
//   }
//   try {
//     isFetchingRandomSongs = true;
//     let randomSongsData = [];
//     const fetchRandomSingleSong = async () => {
//       try {
//         const response = await fetch("/playSong", {
//           method: "POST",
//           headers: {
//             "Content-type": "application/json",
//           },
//         });

//         if (!response.ok) {
//           // Handle non-200 status codes (e.g., 404, 500)
//           console.error(
//             "Error fetching random single song. Status Code:",
//             response.status
//           );
//           return null;
//         }

//         const data = await response.json();
//         return data;
//       } catch (error) {
//         console.error("Error fetching random single song:", error.message);
//         return null;
//       }
//     };

//     console.log("Fetching", count, "random songs...");

//     const fetchPromise = Array.from({ length: count }, () =>
//       fetchRandomSingleSong()
//     );

//     /*
//     Array.from({ length: count }, () => fetchRandomSingleSong()): This line creates an array with a length of
//     count. The array elements are initialized with the result of calling the fetchRandomSingleSong function.
//     Essentially, it creates an array of count promises, where each promise represents the result of calling
//     fetchRandomSingleSong().

//     await Promise.all(fetchPromise): This line uses Promise.all to wait for all the promises in the fetchPromise
//     array to resolve. Promise.all takes an array of promises and returns a new promise that resolves to an array
//     of the resolved values from each input promise. In this case, it waits for all the fetch requests to complete
//     and resolves to an array of the fetched song data.
//     */

//     const fetchedSongs = await Promise.all(fetchPromise);
//     console.log("Fetched raw song data:", fetchedSongs);

//     // Filter out any null values (songs that failed to fetch)
//     const validSongs = fetchedSongs.filter((songData) => songData !== null);
//     // console.log("Filtered valid songs:", validSongs);

//     // Map each fetched song data to the desired format (songData object)
//     const formattedSongs = validSongs.map((data) => ({
//       title: data.title,
//       artist: data.artist,
//       thumbnail_url: data.thumbnail_url,
//       videoId: data.videoId,
//       url: data.url,
//     }));
//     console.log("Formatted songs:", formattedSongs);

//     // Add the fetched songs to the randomSongsData array
//     randomSongsData.push(...formattedSongs);
//     console.log("Random songs data:", randomSongsData);

//     if (randomSongsData.length === 0) {
//       // If no valid songs were fetched, get liked songs from local storage
//       const likedSongsFromLocalStorage = JSON.parse(
//         localStorage.getItem("likedSongs")
//       );

//       if (likedSongsFromLocalStorage && likedSongsFromLocalStorage.length > 0) {
//         try {
//           // Fetch URLs for liked songs from local storage
//           const likedSongsWithUrls = await fetchUrlsForLikedSongs(
//             likedSongsFromLocalStorage
//           );

//           // Check if likedSongsWithUrls is an array and has at least one song with a URL
//           if (
//             Array.isArray(likedSongsWithUrls) &&
//             likedSongsWithUrls.some((song) => song.url)
//           ) {
//             // Add the liked songs with URLs to the randomSongsData array
//             randomSongsData.push(...likedSongsWithUrls);
//             console.log(
//               "edge case randomSongsData List is : ",
//               randomSongsData
//             );
//           }
//         } catch (error) {
//           console.error("Error fetching URLs for liked songs:", error.message);
//         }
//       } else {
//         // Throw a custom error if no valid songs or liked songs were found
//         console.log("No valid songs or liked songs found");
//       }
//     }
//     // Set the flag back to false when fetchRandomSongs is completed (either success or error)
//     isFetchingRandomSongs = false;
//     return randomSongsData;
//   } catch (error) {
//     console.log("Error fetching random songs.");
//     isFetchingRandomSongs = false;
//     return null;
//   }
// };

const getPreFetchedRandomSongs = (count) => {
  // Check if there are any pre-fetched songs in local storage (currentQueue)
  currentQueue = JSON.parse(localStorage.getItem("songsQueue")) || [];

  // Check if currentQueue contains enough pre-fetched songs
  if (currentQueue.length >= count) {
    return currentQueue.slice(0, count);
  }

  // Return null if there are no pre-fetched songs or not enough pre-fetched songs
  return null;
};

// ! <<< CHECK AND UPDATE QUEUE >>>
// Function to check if the current queue has fewer than 3 songs and fetch more if needed
async function checkAndUpdateQueue(count) {
  if (currentQueue.length < 4) {
    const randomSongsData = await fetchRandomSongs(count);
    if (!randomSongsData || randomSongsData.length === 0) {
      console.log(
        "Error: No random songs data fetched while checking and updating queue."
      );
      // You can display an error message to the user or take appropriate action
      // alert("Failed to fetch random songs. Please try again later.");
      return;
    }
    console.log("Fetched random songs data:", randomSongsData);

    // Add the songs to the current queue
    randomSongsData.forEach((songData) => {
      addToBeginningOfQueue(songData);
    });

    console.log("Queue after populating it with random songs:", currentQueue);
    maintainQueueSize();
  }
}

//* Function to play the next song from the queue
const playNextSong = async (videoId = null) => {
  try {
    // If videoId is provided, it means the user selected a specific song to play next
    if (videoId) {
      try {
        console.log("Selected specific song to play next:", videoId);
        const response = await fetch(`/playSong?videoId=${videoId}`, {
          method: "POST",
          headers: {
            "Content-type": "application/json",
          },
        });
        const data = await response.json();
        console.log("Fetched song data:", data);
        // Create a song object with the fetched data
        const songData = {
          title: data.title,
          artist: data.artist,
          thumbnail_url: data.thumbnail_url,
          videoId: data.videoId,
          url: data.url,
        };
        console.log(
          "Song object to add to the beginning of the queue:",
          songData
        );
        // Add the song to the beginning of the current queue
        addToBeginningOfQueue(songData);
        console.log("Queue after adding the song:", currentQueue);
        // Ensure the queue has a maximum of 25 songs
        maintainQueueSize();
        console.log("Queue after maintaining its size:", currentQueue);
      } catch (error) {
        console.error("Error in playNextSong:", error);
      }
    } else {
      // If there is no videoId provided, it means play the next song from the currentQueue
      if (currentQueue.length > 0) {
        console.log(currentQueue);
        console.log("Playing the next song from the current queue.");
        previousQueue.push(currentQueue.shift()); // Move the currently playing song to the previousQueue
        console.log(
          "after moving the current playing song to previous queue: ",
          currentQueue
        );
        maintainPreviousQueueSize();
        console.log("Previous queue after shifting:", previousQueue);

        // Get the next song from the current queue
        const nextSong = getCurrentSongFromCurrentQueue();
        if (nextSong) {
          console.log("Next song to play:", nextSong);
          // Update UI with the next song data directly from the nextSong object
          document
            .querySelector(".audio-link")
            .setAttribute("src", nextSong.url);
          document
            .getElementById("song-image")
            .setAttribute("src", nextSong.thumbnail);
          document.getElementById("song-name").innerHTML =
            setSongNameWithEllipsis(nextSong.title, 30);
          document.getElementById("song-artist").innerHTML = nextSong.artist;

          // Set the video ID as a data attribute on the current liked song icon in current music block to manage like/unlike of current playing songs.
          const currentLikedSongIcon =
            document.getElementById("like-current-song");
          currentLikedSongIcon.setAttribute("song-video-id", nextSong.videoId);

          // Reset the play/pause button to play, initializing for playPause function to run properly
          play.classList.remove("fa-pause");
          play.classList.add("fa-play");
          playPause(); // Play the next song
        }

        // Now, after starting to play the next song, check and update the queue if needed
        if (currentQueue.length < 4) {
          console.log(
            "Checking and updating the current Queue since the current Queue length is less than 4"
          );
          await checkAndUpdateQueue(25);
        }

        updateLocalStorageQueue(); // Update local storage with the updated queues
        console.log("Current queue after playing next song:", currentQueue);
        console.log("Previous queue after playing next song:", previousQueue);
      } else {
        const preFetchedSongs = getPreFetchedRandomSongs(5);
        if (preFetchedSongs && preFetchedSongs.length > 0) {
          console.log("Using pre-fetched random songs...");
          console.log(preFetchedSongs);
          return preFetchedSongs;
        } else {
          const randomSongsData = await fetchRandomSongs(25);

          // Check if randomSongsData is null or empty
          if (!randomSongsData || randomSongsData.length === 0) {
            console.log("Error: No random songs data fetched.");
            // You can display an error message to the user or take appropriate action
            // alert("Failed to fetch random songs. Please try again later.");
            return;
          }
          console.log("Fetched random songs data:", randomSongsData);

          // Add the songs to the current queue
          randomSongsData.forEach((songData) => {
            addToBeginningOfQueue(songData);
          });

          console.log(
            "Queue after populating it with random songs:",
            currentQueue
          );
          maintainQueueSize();
          updateLocalStorageQueue();
          // Play the first song from the queue
          playNextSong();
        }
      }
    }
  } catch (error) {
    console.error("Error in playNextSong:", error);
  }
};

//* Function to add a song to the beginning of the queue
function addToBeginningOfQueue(songData) {
  // currentQueue.unshift(songData); // Add the song to the beginning of the currentQueue
  currentQueue.splice(1, 0, songData);
}

function addToBeginningOfPreviousQueue(songData) {
  previousQueue.splice(1, 0, songData);
}

//* Function to maintain the queue size to a maximum of 25 songs
function maintainQueueSize() {
  if (currentQueue.length > 25) {
    currentQueue.pop(); // Remove the last song in the queue to maintain the size
  }
}

//* Function to maintain the previous queue size to a maximum of 10 songs
function maintainPreviousQueueSize() {
  if (previousQueue.length > 10) {
    previousQueue.shift(); // Remove the first song in the queue to maintain the size
  }
}

// //* Function to fetch URLs for all liked songs
// const fetchUrlsForLikedSongs = async (likedSongs) => {
//   try {
//     const likedSongsWithUrls = [];
//     for (const song of likedSongs) {
//       try {
//         const response = await fetch(`/playSong?videoId=${song.videoId}`, {
//           method: "POST",
//           headers: {
//             "Content-type": "application/json",
//           },
//         });
//         const urlData = await response.json();
//         if (urlData && urlData.url) {
//           likedSongsWithUrls.push({
//             ...song,
//             url: urlData.url,
//           });
//         } else {
//           console.log(`URL not found for videoId: ${song.videoId}`);
//         }
//       } catch (error) {
//         console.error(`Error fetching URL for videoId: ${song.videoId}`, error);
//       }
//     }
//     return likedSongsWithUrls;
//   } catch (error) {
//     console.error("Error fetching URLs for liked songs:", error.message);
//     return null;
//   }
// };

//* Function to play the previous song from the previous queue
const playPreviousSong = () => {
  if (previousQueue.length > 0) {
    // Remove the last played song from the previous queue and add it to the beginning of the current queue
    currentQueue.unshift(previousQueue.pop());

    // Get the next song (which is now the previous song) from the current queue
    const nextSong = getCurrentSongFromCurrentQueue();
    if (nextSong) {
      // Update UI with the previous song data directly from the nextSong object
      document.querySelector(".audio-link").setAttribute("src", nextSong.url);
      document
        .getElementById("song-image")
        .setAttribute("src", nextSong.thumbnail);
      document.getElementById("song-name").innerHTML = setSongNameWithEllipsis(
        nextSong.title,
        30
      );
      document.getElementById("song-artist").innerHTML = nextSong.artist;

      // Set the video ID as a data attribute on the current liked song icon in current music block to manage like/unlike of current playing songs.
      const currentLikedSongIcon = document.getElementById("like-current-song");
      currentLikedSongIcon.setAttribute("song-video-id", nextSong.videoId);

      // Reset the play/pause button to play, initializing for playPause function to run properly
      play.classList.remove("fa-pause");
      play.classList.add("fa-play");
      playPause(); // Play the previous song
    }

    updateLocalStorageQueue(); // Update local storage with the updated queues
  } else {
    console.log("No Previous Song to play! play some songs first.");
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

// Function to fetch and pre-fetch random songs at regular intervals
const prefetchRandomSongsPeriodically = (intervalInSeconds, count) => {
  // Fetch and pre-fetch random songs initially
  fetchAndPreFetchRandomSongs(count);

  // Set the interval to fetch and pre-fetch random songs periodically
  setInterval(() => {
    fetchAndPreFetchRandomSongs(count);
  }, intervalInSeconds * 1000);
};

// Function to fetch and pre-fetch random songs
const fetchAndPreFetchRandomSongs = async (count) => {
  // Fetch random songs
  const randomSongsData = await fetchRandomSongs(count);

  if (randomSongsData && randomSongsData.length > 0) {
    // Store the fetched songs in the currentQueue
    currentQueue.push(...randomSongsData);
    updateLocalStorageQueue(); // Update local storage with the updated currentQueue
  }
};

// Call the function to pre-fetch random songs periodically (e.g., every 5 minutes)
const prefetchIntervalInSeconds = 5 * 60; // 5 minutes
const preFetchCount = 7; // Number of songs to pre-fetch each time
prefetchRandomSongsPeriodically(prefetchIntervalInSeconds, preFetchCount);

//TODO: <<< QUEUE FUNCTIONS END >>>

//TODO: <<< DROPDOWN FOR ADDING OPTIONS TO PLAY NEXT SONG >>>

const toggleDropdown = (event) => {
  const dropdownContent =
    event.currentTarget.parentElement.querySelector(".dropdown-content");

  // Check if the clicked dropdown is already open
  const isAlreadyOpen = dropdownContent.style.display === "block";
  // Close any open dropdowns
  const openDropdowns = document.querySelectorAll(".dropdown-content");
  openDropdowns.forEach((dropdown) => {
    if (dropdown !== dropdownContent || isAlreadyOpen) {
      dropdown.style.display = "none";
    }
  });

  // Toggle the dropdown for the current clicked icon
  dropdownContent.style.display = isAlreadyOpen ? "none" : "block";
};

// Function to shuffle the array in place using Fisher-Yates (Knuth) shuffle algorithm
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

let isShuffled = false;

const handleShuffleSongs = () => {
  isShuffled = !isShuffled;
  let current_shuffled_song = document.getElementById("shuffle-songs-icon");
  current_shuffled_song.classList.toggle("active", isShuffled);
  // Shuffle the currentQueue
  shuffleArray(currentQueue);

  // Since the current song might have changed its position in the queue after shuffling, update the UI with the new song data
  const nextSong = getCurrentSongFromCurrentQueue();
  if (nextSong) {
    document.querySelector(".audio-link").setAttribute("src", nextSong.url);
    document.getElementById("song-image").setAttribute("src", nextSong.thumbnail);
    document.getElementById("song-name").innerHTML = setSongNameWithEllipsis(
      nextSong.title,
      30
    );
    document.getElementById("song-artist").innerHTML = nextSong.artist;

    // Set the video ID as a data attribute on the current liked song icon in current music block to manage like/unlike of current playing songs.
    const currentLikedSongIcon = document.getElementById("like-current-song");
    currentLikedSongIcon.setAttribute("song-video-id", nextSong.videoId);

    // Reset the play/pause button to play, initializing for playPause function to run properly
    play.classList.remove("fa-pause");
    play.classList.add("fa-play");
    playPause(); // Play the next song
  }

  updateLocalStorageQueue(); // Update local storage with the shuffled queue
};

//TODO: <<< Update the current queue list in the UI -> START>>>
const updateCurrentQueueUI = () => {
  const currentQueueSection = document.getElementById("current-queue");

  // Clear any existing items in the section
  currentQueueSection.innerHTML = "";

  // Loop through the currentQueue and add each song's box to the current queue section
  currentQueue.forEach((songData, index) => {
    const songBox = createSongBox(songData, index);
    currentQueueSection.appendChild(songBox);
  });
};

// Function to create a song box HTML element
const createSongBox = (songData, index) => {
  const songBox = document.createElement("div");
  songBox.classList.add("upcoming-song-box");
  songBox.innerHTML = `
    <img src="${songData.thumbnail_url}" alt="" />
    <div class="three_dot_x_icon">
      <i class="fa-solid fa-ellipsis"></i>
    </div>
    <div class="inner_text_box">
      <div class="content_row">
        <div class="song_name_artist_column">
          <div><h3>${songData.title}</h3></div>
          <div class="artist_name_row">
            <i style="color: white; font-size: 0.9rem" class="fa-solid fa-music"></i>
            <p>${songData.artist}</p>
          </div>
        </div>
        <div class="play_button">
          <i class="fa-solid fa-play"></i>
        </div>
      </div>
    </div>
  `;
  return songBox;
};

//TODO: <<< Update the current queue list in the UI -> END>>>