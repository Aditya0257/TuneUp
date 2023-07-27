// Define a flag to keep track of whether fetchRandomSongs is already running
let isFetchingRandomSongs = false;

// Function to fetch random single song
const fetchRandomSingleSong = async () => {
  try {
    const response = await fetch("/playSong", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
    });

    if (!response.ok) {
      // Handle non-200 status codes (e.g., 404, 500)
      console.error(
        "Error fetching random single song. Status Code:",
        response.status
      );
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching random single song:", error.message);
    return null;
  }
};

// Function to fetch URLs for liked songs from local storage
const fetchUrlsForLikedSongs = async (likedSongs) => {
  try {
    const likedSongsWithUrls = [];
    for (const song of likedSongs) {
      try {
        const response = await fetch(`/playSong?videoId=${song.videoId}`, {
          method: "POST",
          headers: {
            "Content-type": "application/json",
          },
        });
        const urlData = await response.json();
        if (urlData && urlData.url) {
          likedSongsWithUrls.push({
            ...song,
            url: urlData.url,
          });
          console.log("Liked songs with URLs:", likedSongsWithUrls);
        } else {
          console.log(`URL not found for videoId: ${song.videoId}`);
        }
      } catch (error) {
        console.error(`Error fetching URL for videoId: ${song.videoId}`, error);
      }
    }
    return likedSongsWithUrls;
  } catch (error) {
    console.error("Error fetching URLs for liked songs:", error.message);
    return null;
  }
};

// Function to fetch random songs data
const fetchRandomSongs = async (count) => {
  // If fetchRandomSongs is already running, return null
  if (isFetchingRandomSongs) {
    console.log("fetchRandomSongs is already running. Skipping the request.");
    return null;
  }

  try {
    isFetchingRandomSongs = true;
    let randomSongsData = [];

    console.log("Fetching", count, "random songs...");

    // Fetch the required number of songs using the fetchRandomSingleSong function
    const fetchPromise = Array.from({ length: count }, fetchRandomSingleSong);

    // Wait for all the fetch requests to complete
    const fetchedSongs = await Promise.all(fetchPromise);
    console.log("Fetched raw song data:", fetchedSongs);

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
    console.log("Random songs data:", randomSongsData);

    if (randomSongsData.length === 0) {
      // If no valid songs were fetched, get liked songs from local storage
      const likedSongsFromLocalStorage = JSON.parse(
        localStorage.getItem("likedSongs")
      );

      if (likedSongsFromLocalStorage && likedSongsFromLocalStorage.length > 0) {
        try {
          // Fetch URLs for liked songs from local storage
          const likedSongsWithUrls = await fetchUrlsForLikedSongs(
            likedSongsFromLocalStorage
          );

          // Check if likedSongsWithUrls is an array and has at least one song with a URL
          if (
            Array.isArray(likedSongsWithUrls) &&
            likedSongsWithUrls.some((song) => song.url)
          ) {
            // Add the liked songs with URLs to the randomSongsData array
            randomSongsData.push(...likedSongsWithUrls);
            console.log(
              "edge case randomSongsData List is : ",
              randomSongsData
            );
          }
        } catch (error) {
          console.error("Error fetching URLs for liked songs:", error.message);
        }
      } else {
        // Throw a custom error if no valid songs or liked songs were found
        console.log("No valid songs or liked songs found");
      }
    }
    // Reset the flag once the request is completed
    isFetchingRandomSongs = false;

    // Once the request is completed, send the response back to the main thread
    self.postMessage({
      type: "FETCH_RANDOM_SONGS_RESPONSE",
      data: randomSongsData,
    });

    return randomSongsData;
  } catch (error) {
    console.log("Error fetching random songs.");
    // Reset the flag in case of an error
    isFetchingRandomSongs = false;
    return null;
  }
};

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  const { type, data } = event.data;

  if (type === "FETCH_RANDOM_SONGS") {
    // Execute the fetchRandomSongs function independently
    fetchRandomSongs(data);
  }
});
