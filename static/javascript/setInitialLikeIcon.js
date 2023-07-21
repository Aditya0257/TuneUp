// Function to set the initial state of heart icons based on liked songs in localStorage
const setInitialLikeIcons = () => {
  console.log("Setting initial like icons...");

  const heartIcons = document.querySelectorAll(".heart-icon");
  const likedSongs = JSON.parse(localStorage.getItem("likedSongs")) || [];

  heartIcons.forEach((heartIcon) => {
    const videoId = heartIcon.id.split("-")[2];
    const isLiked = likedSongs.some((song) => song.videoId === videoId);

    console.log(`Heart icon for videoId ${videoId}: ${isLiked ? "Liked" : "Not Liked"}`);

    if (isLiked) {
      heartIcon.classList.remove("fa-regular");
      heartIcon.classList.add("fas", "fa-heart");
    } else {
      heartIcon.classList.remove("fas");
      heartIcon.classList.add("fa-regular", "fa-heart");
    }
  });

  console.log("Initial like icons set.");
};

// Call setInitialHeartIcons when the page is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("Page loaded. Calling setInitialLikeIcons...");
  setInitialLikeIcons();
});

