let isLiked = false;

const handleLikedSong = (event) => {
  let current_liked_song = document.getElementById("like-current-song");
  const videoId = current_liked_song.getAttribute("song-video-id");

  // Get the liked songs data from localStorage
  let likedSongsLocalStorage =
    JSON.parse(localStorage.getItem("likedSongs")) || [];

  // Check if the current song is already liked in the localStorage
  let isCurrentSongLiked = likedSongsLocalStorage.some(
    (song) => song.videoId === videoId
  );

  // Update the liked status in the localStorage based on the current status
  if (!isLiked && !isCurrentSongLiked) {
    // Add the current song to liked songs if it's not already liked
    likedSongsLocalStorage.push({ videoId });
    isLiked = true;
  } else if (isLiked && isCurrentSongLiked) {
    // Remove the current song from liked songs if it's already liked
    likedSongsLocalStorage = likedSongsLocalStorage.filter(
      (song) => song.videoId !== videoId
    );
    isLiked = false;
  }

  // Update the localStorage with the modified liked songs list
  localStorage.setItem("likedSongs", JSON.stringify(likedSongsLocalStorage));

  // Update the UI by adding or removing the "active" class
  if (isLiked) {
    current_liked_song.classList.add("active");
  } else {
    current_liked_song.classList.remove("active");
  }

  // Call the updateLike_CurrentSong function to update the liked status on the server
  updateLike_CurrentSong(videoId, event);
};

const updateLike_CurrentSong = async (videoId, event) => {
  event.stopPropagation();
  console.log(
    "Updating like/unlike for current playing song of videoId:",
    videoId
  );
  let musicPlayColumn = document.querySelector(".music_play_column");
  let artist = musicPlayColumn.querySelector("#song-artist").textContent;
  let title = musicPlayColumn.querySelector("#song-name").textContent;
  let thumbnail = musicPlayColumn
    .querySelector("#song-image")
    .getAttribute("src");

  // console.log("Artist:", artist);
  // console.log("Title:", title);
  // console.log("Thumbnail:", thumbnail);

  let likedSongsLocalStorage =
    JSON.parse(localStorage.getItem("likedSongs")) || [];

  let isLikedLocalStorage = likedSongsLocalStorage.some(
    (song) => song.videoId === videoId
  );

  try {
    const response = await fetch(`/likeSong`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videoId: videoId,
        title: title,
        artist: artist,
        thumbnail: thumbnail,
        isLiked: isLikedLocalStorage,
      }),
    });
    if (!response.ok) {
      throw new Error("Network response was not ok.");
    }

    const data = await response.json();
    // console.log(
    //   "Server Response for liking a current playing song from music block: ",
    //   data
    // );

    likedSongsLocalStorage = data.liked_songs;
    localStorage.setItem("likedSongs", JSON.stringify(likedSongsLocalStorage));
  } catch (error) {
    console.error(
      "Error while liking the current playing song in music block :",
      error
    );
  }
};

const updateLikedSongs = async (videoId, event) => {
  event.stopPropagation(); // To stop event propagation
  console.log("Updating liked songs for videoId:", videoId);

  // Fetch the required data from the clicked icon element
  let heartIcon = document.getElementById(`heart-icon-${videoId}`);
  let title = heartIcon.getAttribute("title");
  let artist = heartIcon.getAttribute("artist_name");
  let thumbnail = heartIcon.getAttribute("image_url");

  // console.log("Heart icon:", heartIcon);
  // console.log("Title:", title);
  // console.log("Artist:", artist);
  // console.log("Thumbnail:", thumbnail);

  // Get the current liked songs from localStorage
  let likedSongsLocalStorage =
    JSON.parse(localStorage.getItem("likedSongs")) || [];

  // console.log("Current liked songs from localStorage:", likedSongsLocalStorage);

  // Check if the song is already liked
  let isLikedLocalStorage = likedSongsLocalStorage.some(
    (song) => song.videoId === videoId
  );

  // console.log("Is the song already liked?", isLikedLocalStorage);

  try {
    // Send a POST request to the '/likeSong' route to update MongoDB
    const response = await fetch(`/likeSong`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videoId: videoId,
        title: title,
        artist: artist,
        thumbnail: thumbnail,
        isLiked: isLikedLocalStorage, // Send the current liked status to the server
      }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok.");
    }

    const data = await response.json();
    // console.log("Server response:", data);

    if (data.isLiked) {
      heartIcon.classList.remove("fa-regular");
      heartIcon.classList.add("fas", "fa-heart");
      console.log("replaced with filled icon for liked song");
    } else {
      heartIcon.classList.remove("fas");
      heartIcon.classList.add("fa-regular", "fa-heart");
      console.log("replaced with outlined icon for unliked song");
    }

    // Now, update the likedSongsLocalStorage to reflect the changes
    likedSongsLocalStorage = data.liked_songs;
    // console.log("Updated liked songs in localStorage:", likedSongsLocalStorage);

    // Update localStorage with the modified liked songs list
    localStorage.setItem("likedSongs", JSON.stringify(likedSongsLocalStorage));
  } catch (error) {
    console.error("Error updating liked songs:", error);
  }
};
