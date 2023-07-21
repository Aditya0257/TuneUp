const updateLikedSongs = async (videoId) => {
  console.log("Updating liked songs for videoId:", videoId);

  // Fetch the required data from the clicked icon element
  let heartIcon = document.getElementById(`heart-icon-${videoId}`);
  let title = heartIcon.getAttribute("title");
  let artist = heartIcon.getAttribute("artist_name");
  let thumbnail = heartIcon.getAttribute("image_url");

  console.log("Heart icon:", heartIcon);
  console.log("Title:", title);
  console.log("Artist:", artist);
  console.log("Thumbnail:", thumbnail);

  // Get the current liked songs from localStorage
  let likedSongsLocalStorage =
    JSON.parse(localStorage.getItem("likedSongs")) || [];

  console.log("Current liked songs from localStorage:", likedSongsLocalStorage);

  // Check if the song is already liked
  let isLikedLocalStorage = likedSongsLocalStorage.some(
    (song) => song.videoId === videoId
  );

  console.log("Is the song already liked?", isLikedLocalStorage);

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
    console.log("Server response:", data);

    // Update liked songs in localStorage based on the server's response
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
    console.log("Updated liked songs in localStorage:", likedSongsLocalStorage);

    // Update localStorage with the modified liked songs list
    localStorage.setItem("likedSongs", JSON.stringify(likedSongsLocalStorage));
  } catch (error) {
    console.error("Error updating liked songs:", error);
  }
};
