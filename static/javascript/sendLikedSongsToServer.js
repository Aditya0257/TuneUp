// Function to get liked songs from localStorage and send them to the server
const sendLikedSongsToServer = async () => {
  const likedSongs = JSON.parse(localStorage.getItem("likedSongs") || "[]");

  try {
    console.log("Sending liked songs data to the server:", likedSongs);
    likedSongs.forEach((song, index) => {
      console.log(`${index}:`, song);
    });

    const response = await fetch("/music", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ likedSongs }), // Send the liked songs data to the server
    });

    if (!response.ok) {
      throw new Error("Network response was not ok.");
    }

    const data = await response.json();
    console.log("Server response:", data);
  } catch (error) {
    console.error("Error sending liked songs to server:", error);
  }
};

// Call the function to send liked songs to the server when the music page loads
document.addEventListener("DOMContentLoaded", () => {
  sendLikedSongsToServer();
});


